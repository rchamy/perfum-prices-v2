import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateAlerts } from './alert-evaluator'
import { sendPriceAlert } from '../services/notification'
import { chain } from './test-helpers'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../db/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../services/notification', () => ({
  sendPriceAlert: vi.fn(),
}))

const mockSendPriceAlert = vi.mocked(sendPriceAlert)

const PRODUCT_ID = 'prod-uuid'
const STORE_ID = 'store-uuid'

const baseAlert = {
  id: 'alert-1',
  product_id: PRODUCT_ID,
  store_id: null,
  is_active: true,
  threshold_type: 'percentage',
  threshold_value: 10,
  users: { email: 'user@test.com', notification_channel: 'email', telegram_chat_id: null },
}

const storeProduct = { id: 'sp-uuid', product_url: 'https://store.com/product' }
const storeRow = { name: 'Silk Perfumes' }
const productRow = { name: 'Chanel No 5' }

function setupMocks(opts: {
  alerts?: any[]
  storeProduct?: any
  prevPrice?: any
}) {
  mockFrom
    .mockReturnValueOnce(chain({ data: opts.alerts ?? [], error: null }))           // alerts
    .mockReturnValueOnce(chain({ data: opts.storeProduct ?? null, error: null }))   // store_products
    .mockReturnValueOnce(chain({ data: opts.prevPrice ?? null, error: null }))      // prices (prev)
    .mockReturnValueOnce(chain({ data: storeRow, error: null }))                    // stores
    .mockReturnValueOnce(chain({ data: productRow, error: null }))                  // products
    .mockReturnValue(chain({ data: null, error: null }))                            // alerts update
}

describe('evaluateAlerts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSendPriceAlert.mockResolvedValue(undefined)
  })

  it('does nothing when no alerts are configured for the product', async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }))

    await evaluateAlerts(PRODUCT_ID, STORE_ID, 10000)

    expect(mockSendPriceAlert).not.toHaveBeenCalled()
  })

  it('returns early when store_product is not found', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [baseAlert], error: null })) // alerts
      .mockReturnValueOnce(chain({ data: null, error: null }))         // store_products (null)

    await evaluateAlerts(PRODUCT_ID, STORE_ID, 10000)

    expect(mockSendPriceAlert).not.toHaveBeenCalled()
  })

  it('returns early when there is no previous price to compare against', async () => {
    setupMocks({ alerts: [baseAlert], storeProduct, prevPrice: null })

    await evaluateAlerts(PRODUCT_ID, STORE_ID, 10000)

    expect(mockSendPriceAlert).not.toHaveBeenCalled()
  })

  it('fires alert when percentage drop meets threshold', async () => {
    // Previous price: 20000 → new price: 10000 → 50% drop (threshold: 10%)
    setupMocks({
      alerts: [baseAlert],
      storeProduct,
      prevPrice: { price_normal: 20000, price_discounted: null },
    })

    await evaluateAlerts(PRODUCT_ID, STORE_ID, 10000)

    expect(mockSendPriceAlert).toHaveBeenCalledOnce()
    expect(mockSendPriceAlert).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@test.com',
      oldPrice: 20000,
      newPrice: 10000,
      storeName: 'Silk Perfumes',
      productName: 'Chanel No 5',
    }))
  })

  it('does NOT fire alert when percentage drop is below threshold', async () => {
    // Previous price: 20000 → new price: 19000 → 5% drop (threshold: 10%)
    setupMocks({
      alerts: [baseAlert],
      storeProduct,
      prevPrice: { price_normal: 20000, price_discounted: null },
    })

    await evaluateAlerts(PRODUCT_ID, STORE_ID, 19000)

    expect(mockSendPriceAlert).not.toHaveBeenCalled()
  })

  it('fires alert when absolute price threshold is met', async () => {
    const absoluteAlert = { ...baseAlert, threshold_type: 'absolute', threshold_value: 15000 }
    setupMocks({
      alerts: [absoluteAlert],
      storeProduct,
      prevPrice: { price_normal: 20000, price_discounted: null },
    })

    // New price 12000 <= threshold 15000
    await evaluateAlerts(PRODUCT_ID, STORE_ID, 12000)

    expect(mockSendPriceAlert).toHaveBeenCalledOnce()
  })

  it('does NOT fire absolute alert when price is above threshold', async () => {
    const absoluteAlert = { ...baseAlert, threshold_type: 'absolute', threshold_value: 15000 }
    setupMocks({
      alerts: [absoluteAlert],
      storeProduct,
      prevPrice: { price_normal: 20000, price_discounted: null },
    })

    // New price 18000 > threshold 15000
    await evaluateAlerts(PRODUCT_ID, STORE_ID, 18000)

    expect(mockSendPriceAlert).not.toHaveBeenCalled()
  })

  it('uses discounted price as previous price when available', async () => {
    setupMocks({
      alerts: [baseAlert],
      storeProduct,
      prevPrice: { price_normal: 25000, price_discounted: 20000 }, // effective prev = 20000
    })

    // 50% drop from 20000 → meets 10% threshold
    await evaluateAlerts(PRODUCT_ID, STORE_ID, 10000)

    expect(mockSendPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ oldPrice: 20000 }),
    )
  })
})
