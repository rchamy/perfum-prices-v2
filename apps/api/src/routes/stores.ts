import { Router } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth'

const router = Router()

// GET /stores — public list of active stores
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, logo_url, method, country')
    .eq('is_active', true)
    .order('name')

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// POST /stores — admin only
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { selectors, ...storeData } = req.body

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert(storeData)
    .select()
    .single()

  if (storeError) return res.status(400).json({ error: storeError.message })

  if (selectors?.length) {
    const selectorRows = selectors.map((s: any) => ({ ...s, store_id: store.id, updated_by: req.userId }))
    await supabase.from('store_selectors').insert(selectorRows)
  }

  res.status(201).json({ data: store })
})

// PUT /stores/:id — admin only
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params
  const { selectors, ...storeData } = req.body

  const { data: store, error } = await supabase
    .from('stores')
    .update({ ...storeData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  if (selectors?.length) {
    for (const s of selectors) {
      await supabase
        .from('store_selectors')
        .upsert({ ...s, store_id: id, updated_by: req.userId, updated_at: new Date().toISOString() }, { onConflict: 'store_id,field' })
    }
  }

  res.json({ data: store })
})

// PATCH /stores/:id/toggle — admin only
router.patch('/:id/toggle', authenticate, requireAdmin, async (_req, res) => {
  const { id } = _req.params

  const { data: current } = await supabase.from('stores').select('is_active').eq('id', id).single()
  const { data, error } = await supabase
    .from('stores')
    .update({ is_active: !current?.is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

// POST /stores/test-scrape — admin only
router.post('/test-scrape', authenticate, requireAdmin, async (req, res) => {
  const workerUrl = process.env.WORKER_INTERNAL_URL
  if (!workerUrl) return res.status(503).json({ error: 'Worker URL not configured' })

  try {
    const response = await fetch(`${workerUrl}/internal/test-scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(35_000),
    })
    const result = await response.json()
    res.json(result)
  } catch (err: any) {
    res.status(504).json({ error: 'Worker timeout or unavailable', detail: err.message })
  }
})

export default router
