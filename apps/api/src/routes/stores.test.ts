import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app'
import { chain } from './test-helpers'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../db/supabase', () => ({
  supabase: { from: mockFrom },
}))

const app = createApp()

describe('GET /stores', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with store list', async () => {
    const stores = [
      { id: 's1', name: 'Silk Perfumes', is_active: true, method: 'scraper' },
      { id: 's2', name: 'SAIRAM', is_active: true, method: 'scraper' },
    ]
    mockFrom.mockReturnValue(chain({ data: stores, error: null }))

    const res = await request(app).get('/stores')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].name).toBe('Silk Perfumes')
  })

  it('returns 500 on DB error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'timeout' } }))

    const res = await request(app).get('/stores')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('timeout')
  })
})
