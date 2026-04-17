import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app'
import { chain } from './test-helpers'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../db/supabase', () => ({
  supabase: { from: mockFrom },
}))

const app = createApp()

describe('GET /prices/:productId/history', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty data when no store_products exist', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: [], error: null })) // store_products

    const res = await request(app).get('/prices/prod-1/history')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('returns grouped price history per store (single batch query)', async () => {
    const storeProducts = [
      { id: 'sp1', store_id: 's1', stores: { name: 'Silk Perfumes' } },
      { id: 'sp2', store_id: 's2', stores: { name: 'SAIRAM' } },
    ]
    const prices = [
      { store_product_id: 'sp1', captured_at: '2026-04-01T12:00:00Z', price_normal: 35000, price_discounted: null },
      { store_product_id: 'sp1', captured_at: '2026-04-10T12:00:00Z', price_normal: 35000, price_discounted: 28000 },
      { store_product_id: 'sp2', captured_at: '2026-04-05T12:00:00Z', price_normal: 32000, price_discounted: null },
    ]

    mockFrom
      .mockReturnValueOnce(chain({ data: storeProducts, error: null })) // store_products
      .mockReturnValueOnce(chain({ data: prices, error: null }))         // prices (batch)

    const res = await request(app).get('/prices/prod-1/history')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)

    const silk = res.body.data.find((s: any) => s.store_name === 'Silk Perfumes')
    expect(silk.data).toHaveLength(2)
    expect(silk.data[1].price).toBe(28000) // discounted price used when available

    const sairam = res.body.data.find((s: any) => s.store_name === 'SAIRAM')
    expect(sairam.data).toHaveLength(1)
    expect(sairam.data[0].price).toBe(32000) // normal price used when no discount
  })

  it('returns 500 on DB error in store_products query', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null, error: { message: 'DB down' } }))

    const res = await request(app).get('/prices/prod-1/history')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('DB down')
  })
})
