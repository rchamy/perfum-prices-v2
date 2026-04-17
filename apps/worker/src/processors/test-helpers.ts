import { vi } from 'vitest'

/**
 * Creates a chainable Supabase query builder mock for worker tests.
 * Mirrors the API test helper but lives in the worker package.
 */
export function chain(result: { data?: any; error?: any }) {
  const c: any = {}
  for (const m of [
    'select', 'eq', 'neq', 'or', 'in', 'not', 'gte', 'lte',
    'order', 'range', 'limit', 'insert', 'update', 'upsert', 'delete',
  ]) {
    c[m] = vi.fn(() => c)
  }
  c.single = vi.fn(() => Promise.resolve(result))
  c.maybeSingle = vi.fn(() => Promise.resolve(result))
  c.then = (resolve: (v: any) => any) => resolve(result)
  return c
}
