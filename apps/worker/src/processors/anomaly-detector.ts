import { supabase } from '../db/supabase'
import { sendScraperAlert } from '../services/notification'
import type { ScrapeResult } from '../connectors/scraper'

const APP_URL = process.env.APP_URL ?? 'http://localhost:4200'
const MAX_CONSECUTIVE_ALERTS = 3

export async function detectAnomalies(
  storeId: string,
  storeName: string,
  results: ScrapeResult[],
  httpError?: string,
): Promise<boolean> {
  const isAnomaly = httpError != null || results.length === 0

  if (!isAnomaly) return false

  const errorMessage = httpError ?? '0 productos obtenidos del scraper'

  // Count consecutive non-notified errors to avoid spam
  const { data: recentLogs } = await supabase
    .from('worker_logs')
    .select('status, notified')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(MAX_CONSECUTIVE_ALERTS)

  const allErrors = recentLogs?.every((l) => l.status === 'error') ?? false
  const alreadyNotified = recentLogs?.filter((l) => l.notified).length ?? 0

  if (!allErrors || alreadyNotified < MAX_CONSECUTIVE_ALERTS) {
    await sendScraperAlert({
      storeName,
      errorMessage,
      adminPanelUrl: `${APP_URL}/admin/stores`,
    }).catch(console.error)
  }

  return true
}
