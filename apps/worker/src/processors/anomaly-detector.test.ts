import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectAnomalies } from './anomaly-detector'
import { sendScraperAlert } from '../services/notification'
import { chain } from './test-helpers'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../db/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../services/notification', () => ({
  sendScraperAlert: vi.fn(),
}))

const mockSendScraperAlert = vi.mocked(sendScraperAlert)

const STORE_ID = 'store-uuid'
const STORE_NAME = 'Silk Perfumes'

describe('detectAnomalies', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSendScraperAlert.mockResolvedValue(undefined)
  })

  it('returns false when results are present and no error', async () => {
    const results = [{ product_name: 'Perfume', price_normal: 10000, price_discounted: null, payment_method: null, product_url: 'http://x.com', image_url: null, brand: null }]

    const isAnomaly = await detectAnomalies(STORE_ID, STORE_NAME, results)

    expect(isAnomaly).toBe(false)
    expect(mockSendScraperAlert).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns true and sends alert when results are empty', async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null })) // no recent logs

    const isAnomaly = await detectAnomalies(STORE_ID, STORE_NAME, [])

    expect(isAnomaly).toBe(true)
    expect(mockSendScraperAlert).toHaveBeenCalledOnce()
    expect(mockSendScraperAlert).toHaveBeenCalledWith(
      expect.objectContaining({ storeName: STORE_NAME }),
    )
  })

  it('returns true and sends alert when httpError is provided', async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }))

    const isAnomaly = await detectAnomalies(STORE_ID, STORE_NAME, [], 'Navigation timeout')

    expect(isAnomaly).toBe(true)
    expect(mockSendScraperAlert).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Navigation timeout' }),
    )
  })

  it('suppresses notification when all recent logs are errors and already notified MAX times', async () => {
    // 3 consecutive errors all already notified → spam prevention kicks in
    const recentLogs = [
      { status: 'error', notified: true },
      { status: 'error', notified: true },
      { status: 'error', notified: true },
    ]
    mockFrom.mockReturnValue(chain({ data: recentLogs, error: null }))

    const isAnomaly = await detectAnomalies(STORE_ID, STORE_NAME, [])

    // Still an anomaly, but no notification sent
    expect(isAnomaly).toBe(true)
    expect(mockSendScraperAlert).not.toHaveBeenCalled()
  })

  it('sends alert when errors exist but not all are notified', async () => {
    const recentLogs = [
      { status: 'error', notified: true },
      { status: 'error', notified: false },
      { status: 'error', notified: false },
    ]
    mockFrom.mockReturnValue(chain({ data: recentLogs, error: null }))

    const isAnomaly = await detectAnomalies(STORE_ID, STORE_NAME, [])

    expect(isAnomaly).toBe(true)
    expect(mockSendScraperAlert).toHaveBeenCalledOnce()
  })
})
