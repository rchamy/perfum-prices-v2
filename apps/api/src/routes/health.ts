import { Router } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin } from '../middleware/auth'

const router = Router()

router.use(authenticate, requireAdmin)

// GET /health/worker
router.get('/worker', async (_req, res) => {
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, logo_url')

  const results = await Promise.all(
    (stores ?? []).map(async (store) => {
      const { data: logs } = await supabase
        .from('worker_logs')
        .select('status, products_found, error_message, started_at, finished_at')
        .eq('store_id', store.id)
        .order('started_at', { ascending: false })
        .limit(24)

      const lastSuccess = logs?.find((l) => l.status === 'success')
      const lastError = logs?.find((l) => l.status === 'error')

      const now = Date.now()
      const lastSuccessMs = lastSuccess ? now - new Date(lastSuccess.started_at).getTime() : Infinity
      const status =
        lastSuccessMs < 60 * 60 * 1000 ? 'ok'
          : lastSuccessMs < 3 * 60 * 60 * 1000 ? 'warning'
            : 'error'

      return {
        store_id: store.id,
        store_name: store.name,
        status,
        last_success_at: lastSuccess?.started_at ?? null,
        last_error_at: lastError?.started_at ?? null,
        last_error_message: lastError?.error_message ?? null,
        last_products_found: lastSuccess?.products_found ?? 0,
        recent_logs: logs?.slice(0, 24) ?? [],
      }
    }),
  )

  res.json({ data: results })
})

// POST /health/worker/:storeId/run — trigger manual execution
router.post('/worker/:storeId/run', async (req, res) => {
  const { storeId } = req.params
  const workerUrl = process.env.WORKER_INTERNAL_URL

  if (!workerUrl) return res.status(503).json({ error: 'Worker URL not configured' })

  await supabase.from('job_queue').insert({ store_id: storeId })
  res.json({ message: 'Job queued', store_id: storeId })
})

// GET /health/worker/:storeId/last-log
router.get('/worker/:storeId/last-log', async (req, res) => {
  const { data } = await supabase
    .from('worker_logs')
    .select('*')
    .eq('store_id', req.params.storeId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  res.json({ data })
})

export default router
