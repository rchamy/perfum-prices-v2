import { Router } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// GET /favorites
router.get('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('favorites')
    .select(`*, products ( id, name, image_url, brands ( name ) )`)
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// POST /favorites
router.post('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('favorites')
    .insert({ product_id: req.body.product_id, user_id: req.userId })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ data })
})

// DELETE /favorites/:productId
router.delete('/:productId', async (req: AuthRequest, res) => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('product_id', req.params.productId)
    .eq('user_id', req.userId!)

  if (error) return res.status(400).json({ error: error.message })
  res.status(204).send()
})

export default router
