import type { NextFunction, Request, Response } from 'express'
import { supabase } from '../db/supabase'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  req.userId = data.user.id
  req.userRole = user?.role ?? 'visitor'
  next()
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
