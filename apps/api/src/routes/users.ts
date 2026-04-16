import { Router } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()

// GET /users/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, notification_channel, telegram_chat_id')
    .eq('id', req.userId!)
    .single()

  if (error) return res.status(404).json({ error: 'User not found' })
  res.json({ data })
})

// PUT /users/me
router.put('/me', authenticate, async (req: AuthRequest, res) => {
  const { name, notification_channel } = req.body
  const { data, error } = await supabase
    .from('users')
    .update({ name, notification_channel })
    .eq('id', req.userId!)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

// POST /users/me/telegram/link — generate link token
router.post('/me/telegram/link', authenticate, async (req: AuthRequest, res) => {
  const token = crypto.randomUUID()
  await supabase
    .from('users')
    .update({ telegram_link_token: token })
    .eq('id', req.userId!)

  res.json({ token, expires_in: 600 })
})

// POST /telegram/verify — called by the Telegram bot
router.post('/telegram/verify', async (req, res) => {
  const { token, telegram_chat_id } = req.body
  if (!token || !telegram_chat_id) {
    return res.status(400).json({ error: 'token and telegram_chat_id are required' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .update({ telegram_chat_id, telegram_link_token: null })
    .eq('telegram_link_token', token)
    .select()
    .single()

  if (error || !user) return res.status(404).json({ error: 'Invalid or expired token' })
  res.json({ message: 'Telegram linked successfully' })
})

// GET /admin/users — admin only
router.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  const { q, page = '1', limit = '20' } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  let query = supabase
    .from('users')
    .select('id, email, name, role, notification_channel, created_at', { count: 'exact' })
    .range(offset, offset + Number(limit) - 1)
    .order('created_at', { ascending: false })

  if (q) query = query.ilike('email', `%${q}%`)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data, total: count, page: Number(page), limit: Number(limit) })
})

// PATCH /admin/users/:id/role — admin only
router.patch('/admin/users/:id/role', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params
  if (id === req.userId) {
    return res.status(400).json({ error: 'Cannot change your own role' })
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role: req.body.role })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

export default router
