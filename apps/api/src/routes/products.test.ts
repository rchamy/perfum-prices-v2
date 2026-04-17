import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app'
import { chain } from './test-helpers'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('../db/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}))

const app = createApp()

describe('GET /products', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with product list and total', async () => {
    mockFrom.mockReturnValue(
      chain({ data: [{ id: 'p1', name: 'Chanel No 5', best_price: 35000 }], error: null, count: 1 }),
    )

    const res = await request(app).get('/products')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('Chanel No 5')
    expect(res.body.total).toBe(1)
  })

  it('returns 500 when DB returns an error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'connection refused' }, count: null }))

    const res = await request(app).get('/products')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('connection refused')
  })

  it('respects limit and offset query params', async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null, count: 100 }))

    const res = await request(app).get('/products?limit=10&offset=20')

    expect(res.status).toBe(200)
    expect(res.body.limit).toBe(10)
  })
})

describe('GET /products/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when product does not exist', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValueOnce(chain({ data: null, error: { message: 'not found' } }))

    const res = await request(app).get('/products/nonexistent')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Product not found')
  })

  it('returns 200 with product detail when found', async () => {
    const rawProduct = {
      id: 'p1',
      name: 'Chanel No 5',
      gender: 'F',
      description: 'A classic fragrance',
      image_url: 'https://img.example.com/chanel.jpg',
      brands: { name: 'Chanel' },
      product_notes: [],
    }
    mockRpc.mockResolvedValue({ data: 28000, error: null })
    mockFrom
      .mockReturnValueOnce(chain({ data: rawProduct, error: null }))  // products
      .mockReturnValueOnce(chain({ data: [], error: null }))           // store_products

    const res = await request(app).get('/products/p1')

    expect(res.status).toBe(200)
    expect(res.body.product.name).toBe('Chanel No 5')
    expect(res.body.product.brand).toBe('Chanel')
    expect(res.body.product.min_historical_price).toBe(28000)
  })

  it('returns product with empty stores array when no store_products', async () => {
    const rawProduct = {
      id: 'p2', name: 'Test', gender: null, description: null, image_url: null,
      brands: { name: 'TestBrand' }, product_notes: [],
    }
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom
      .mockReturnValueOnce(chain({ data: rawProduct, error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }))

    const res = await request(app).get('/products/p2')

    expect(res.status).toBe(200)
    expect(res.body.product.prices).toEqual([])
  })
})
