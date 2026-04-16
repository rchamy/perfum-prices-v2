export type UserRole = 'admin' | 'visitor'

export type NotificationChannel = 'email' | 'telegram' | 'both'

export type StoreMethod = 'scraper' | 'api'

export type SelectorType = 'css' | 'xpath'

export type SelectorField =
  | 'product_name'
  | 'price_normal'
  | 'price_discount'
  | 'payment_method'
  | 'product_url'
  | 'image_url'
  | 'brand'

export type Gender = 'male' | 'female' | 'unisex'

export type NoteType = 'top' | 'heart' | 'base'

export type ThresholdType = 'percentage' | 'fixed_price'

export type WorkerStatus = 'success' | 'error' | 'partial'
