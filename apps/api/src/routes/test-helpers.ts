import { vi } from 'vitest'

/**
 * Creates a chainable Supabase query builder mock.
 * Any method returns the same chain object (fluent API simulation).
 * Direct `await` and `.single()` / `.maybeSingle()` both resolve to `result`.
 */
export function chain(result: { data?: any; error?: any; count?: number }) {
  const c: any = {}
  for (const m of [
    'select', 'eq', 'neq', 'or', 'in', 'not', 'gte', 'lte',
    'ilike', 'order', 'range', 'limit', 'insert', 'update',
    'upsert', 'delete', 'filter',
  ]) {
    c[m] = vi.fn(() => c)
  }
  c.single = vi.fn(() => Promise.resolve(result))
  c.maybeSingle = vi.fn(() => Promise.resolve(result))
  // Makes `await chain` work (thenable duck-typing)
  c.then = (resolve: (v: any) => any) => resolve(result)
  return c
}
