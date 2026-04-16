import type {
  Gender,
  NotificationChannel,
  NoteType,
  SelectorField,
  SelectorType,
  StoreMethod,
  ThresholdType,
  UserRole,
  WorkerStatus,
} from './enums'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  notification_channel: NotificationChannel
  telegram_chat_id: string | null
  telegram_link_token: string | null
  created_at: string
}

export interface Store {
  id: string
  name: string
  url: string
  logo_url: string | null
  method: StoreMethod
  api_config: ApiConfig | null
  scrape_frequency_minutes: number
  is_active: boolean
  country: string
  created_at: string
  updated_at: string
}

export interface ApiConfig {
  baseUrl: string
  path: string
  queryParams: Record<string, string>
  headers: Record<string, string>
  fieldMapping: {
    name: string
    price: string
    discountPrice: string | null
    paymentMethod: string | null
    productUrl: string
    imageUrl: string | null
  }
}

export interface StoreSelector {
  id: string
  store_id: string
  field: SelectorField
  selector: string
  selector_type: SelectorType
  updated_at: string
  updated_by: string | null
}

export interface Brand {
  id: string
  name: string
  country_of_origin: string | null
}

export interface OlfactiveFamily {
  id: string
  name: string
}

export interface OlfactiveNote {
  id: string
  family_id: string
  name: string
}

export interface Product {
  id: string
  brand_id: string
  name: string
  gender: Gender
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface ProductNote {
  id: string
  product_id: string
  note_id: string
  note_type: NoteType
}

export interface StoreProduct {
  id: string
  store_id: string
  product_id: string
  product_url: string
  external_id: string | null
  is_active: boolean
  last_scraped_at: string | null
}

export interface Price {
  id: string
  store_product_id: string
  price_normal: number
  price_discounted: number | null
  payment_method: string | null
  discount_label: string | null
  currency: string
  captured_at: string
}

export interface Alert {
  id: string
  user_id: string
  product_id: string
  store_id: string | null
  threshold_type: ThresholdType
  threshold_value: number
  notification_channel: NotificationChannel
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  product_id: string
  created_at: string
}

export interface WorkerLog {
  id: string
  store_id: string
  started_at: string
  finished_at: string | null
  status: WorkerStatus
  products_found: number
  error_message: string | null
  notified: boolean
  created_at: string
}
