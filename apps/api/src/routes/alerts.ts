import { Router } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// GET /alerts
router.get('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .select(`*, products ( name, image_url, brands ( name ) ), stores ( name )`)
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// POST /alerts
router.post('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .insert({ ...req.body, user_id: req.userId })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ data })
})

// PUT /alerts/:id
router.put('/:id', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

// PATCH /alerts/:id/toggle
router.patch('/:id/toggle', async (req: AuthRequest, res) => {
  const { data: current } = await supabase
    .from('alerts')
    .select('is_active')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single()

  const { data, error } = await supabase
    .from('alerts')
    .update({ is_active: !current?.is_active })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

// DELETE /alerts/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)

  if (error) return res.status(400).json({ error: error.message })
  res.status(204).send()
})

export default router
