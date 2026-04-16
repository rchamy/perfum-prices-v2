import cron from 'node-cron'
import { supabase } from './db/supabase'
import { scrapeProduct } from './connectors/scraper'
import { fetchMercadoLibrePerfumes } from './connectors/mercadolibre'
import { detectAnomalies } from './processors/anomaly-detector'
import { writePrices } from './processors/price-writer'

const runningJobs = new Set<string>()

async function runStoreJob(storeId: string) {
  if (runningJobs.has(storeId)) return
  runningJobs.add(storeId)

  const startedAt = new Date().toISOString()

  const { data: store } = await supabase
    .from('stores')
    .select('*, store_selectors(*)')
    .eq('id', storeId)
    .single()

  if (!store) { runningJobs.delete(storeId); return }

  let results: any[] = []
  let errorMessage: string | null = null
  let status: 'success' | 'error' | 'partial' = 'success'

  try {
    if (store.method === 'api') {
      results = await fetchMercadoLibrePerfumes(store.api_config?.queryParams ?? {})
    } else {
      const { data: storeProducts } = await supabase
        .from('store_products')
        .select('product_url')
        .eq('store_id', storeId)
        .eq('is_active', true)

      for (const sp of storeProducts ?? []) {
        const result = await scrapeProduct(sp.product_url, store.store_selectors)
        if (result.price_normal !== null) results.push(result)
      }
    }

    const isAnomaly = await detectAnomalies(storeId, store.name, results)
    if (isAnomaly) { status = 'error'; errorMessage = '0 productos obtenidos' }
    else { await writePrices(storeId, results) }
  } catch (err: any) {
    status = 'error'
    errorMessage = err.message
    await detectAnomalies(storeId, store.name, [], errorMessage ?? undefined)
  }

  await supabase.from('worker_logs').insert({
    store_id: storeId,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status,
    products_found: results.length,
    error_message: errorMessage,
    notified: status === 'error',
  })

  runningJobs.delete(storeId)
}

export async function startScheduler() {
  console.log('Scheduler started')

  // Check every minute which stores are due
  cron.schedule('* * * * *', async () => {
    const { data: stores } = await supabase
      .from('stores')
      .select('id, scrape_frequency_minutes')
      .eq('is_active', true)

    for (const store of stores ?? []) {
      const { data: lastLog } = await supabase
        .from('worker_logs')
        .select('started_at')
        .eq('store_id', store.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastRun = lastLog?.started_at ? new Date(lastLog.started_at).getTime() : 0
      const minutesSinceLast = (Date.now() - lastRun) / 60_000

      if (minutesSinceLast >= (store.scrape_frequency_minutes ?? 60)) {
        runStoreJob(store.id).catch(console.error)
      }
    }
  })

  // Poll job_queue for manual triggers
  cron.schedule('*/5 * * * * *', async () => {
    const { data: jobs } = await supabase
      .from('job_queue')
      .select('id, store_id')
      .eq('status', 'pending')
      .limit(5)

    for (const job of jobs ?? []) {
      await supabase.from('job_queue').update({ status: 'running', picked_at: new Date().toISOString() }).eq('id', job.id)
      runStoreJob(job.store_id)
        .then(() => supabase.from('job_queue').update({ status: 'done' }).eq('id', job.id))
        .catch(() => supabase.from('job_queue').update({ status: 'failed' }).eq('id', job.id))
    }
  })
}
