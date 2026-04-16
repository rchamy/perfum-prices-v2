import type { NotificationChannel, SelectorType, StoreMethod, ThresholdType } from './enums'
import type { ApiConfig } from './models'

// --- Stores ---

export interface CreateStoreDto {
  name: string
  url: string
  logo_url?: string
  method: StoreMethod
  scrape_frequency_minutes: number
  country?: string
  api_config?: ApiConfig
}

export interface UpdateStoreDto extends Partial<CreateStoreDto> {}

export interface TestScrapeDto {
  url: string
  selectors: Array<{ field: string; selector: string; selector_type: SelectorType }>
}

export interface TestScrapeResult {
  field: string
  value: string | null
  error: string | null
}

// --- Alerts ---

export interface CreateAlertDto {
  product_id: string
  store_id?: string | null
  threshold_type: ThresholdType
  threshold_value: number
  notification_channel: NotificationChannel
}

export interface UpdateAlertDto extends Partial<CreateAlertDto> {}

// --- Users ---

export interface UpdateUserDto {
  name?: string
  notification_channel?: NotificationChannel
}

// --- API Responses ---

export interface ProductSummary {
  id: string
  name: string
  brand: string
  gender: string
  image_url: string | null
  best_price: number | null
  best_price_discounted: number | null
  best_store: string | null
  max_discount_pct: number | null
}

export interface ProductDetail {
  id: string
  name: string
  brand: string
  gender: string
  description: string | null
  image_url: string | null
  notes: Array<{ name: string; family: string; type: string }>
  prices: Array<{
    store_id: string
    store_name: string
    store_logo: string | null
    price_normal: number
    price_discounted: number | null
    payment_method: string | null
    discount_label: string | null
    product_url: string
    captured_at: string
  }>
  min_historical_price: number | null
}

export interface PriceHistory {
  store_id: string
  store_name: string
  data: Array<{ date: string; price: number }>
}

export interface WorkerHealthSummary {
  store_id: string
  store_name: string
  status: 'ok' | 'warning' | 'error'
  last_success_at: string | null
  last_error_at: string | null
  last_error_message: string | null
  last_products_found: number
  recent_logs: Array<{ status: string; products_found: number; started_at: string }>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
