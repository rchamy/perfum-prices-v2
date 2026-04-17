import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import type {
  Alert,
  CreateAlertDto,
  PaginatedResponse,
  PriceHistory,
  ProductDetail,
  ProductSummary,
  UpdateUserDto,
  WorkerHealthSummary,
} from '@perfum/shared'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl

  constructor(private http: HttpClient) {}

  // Products
  getProducts(filters: Record<string, string | number> = {}) {
    let params = new HttpParams()
    Object.entries(filters).forEach(([k, v]) => (params = params.set(k, String(v))))
    return this.http.get<PaginatedResponse<ProductSummary>>(`${this.base}/products`, { params })
  }

  getBrands() {
    return this.http.get<{ data: string[] }>(`${this.base}/products/brands`)
  }

  getProduct(id: string) {
    return this.http.get<{ product: ProductDetail }>(`${this.base}/products/${id}`)
  }

  // Prices
  getCurrentPrices(productId: string) {
    return this.http.get<{ data: any[] }>(`${this.base}/prices/${productId}/current`)
  }

  getPriceHistory(productId: string, range = '30d', stores?: string[]) {
    let params = new HttpParams().set('range', range)
    if (stores?.length) params = params.set('stores', stores.join(','))
    return this.http.get<{ data: PriceHistory[] }>(`${this.base}/prices/${productId}/history`, { params })
  }

  // Stores
  getStores(all = false) {
    let params = new HttpParams()
    if (all) params = params.set('all', 'true')
    return this.http.get<{ data: any[] }>(`${this.base}/stores`, { params })
  }

  createStore(body: any) {
    return this.http.post(`${this.base}/stores`, body)
  }

  updateStore(id: string, body: any) {
    return this.http.put(`${this.base}/stores/${id}`, body)
  }

  toggleStore(id: string) {
    return this.http.patch(`${this.base}/stores/${id}/toggle`, {})
  }

  testScrape(body: any) {
    return this.http.post(`${this.base}/stores/test-scrape`, body)
  }

  getStoreProducts(storeId: string) {
    return this.http.get<{ data: any[] }>(`${this.base}/stores/${storeId}/products`)
  }

  addStoreProductUrl(storeId: string, productUrl: string) {
    return this.http.post(`${this.base}/stores/${storeId}/products`, { product_url: productUrl })
  }

  removeStoreProductUrl(storeId: string, spId: string) {
    return this.http.delete(`${this.base}/stores/${storeId}/products/${spId}`)
  }

  // Alerts
  getAlerts() {
    return this.http.get<{ data: Alert[] }>(`${this.base}/alerts`)
  }

  createAlert(body: CreateAlertDto) {
    return this.http.post<{ data: Alert }>(`${this.base}/alerts`, body)
  }

  updateAlert(id: string, body: Partial<CreateAlertDto>) {
    return this.http.put<{ data: Alert }>(`${this.base}/alerts/${id}`, body)
  }

  toggleAlert(id: string) {
    return this.http.patch(`${this.base}/alerts/${id}/toggle`, {})
  }

  deleteAlert(id: string) {
    return this.http.delete(`${this.base}/alerts/${id}`)
  }

  // Favorites
  getFavorites() {
    return this.http.get<{ data: unknown[] }>(`${this.base}/favorites`)
  }

  addFavorite(productId: string) {
    return this.http.post(`${this.base}/favorites`, { product_id: productId })
  }

  removeFavorite(productId: string) {
    return this.http.delete(`${this.base}/favorites/${productId}`)
  }

  // Users
  getMe() {
    return this.http.get<{ data: any }>(`${this.base}/users/me`)
  }

  updateMe(body: UpdateUserDto) {
    return this.http.put(`${this.base}/users/me`, body)
  }

  requestTelegramLink() {
    return this.http.post<{ token: string; expires_in: number }>(`${this.base}/users/me/telegram/link`, {})
  }

  // Admin
  getWorkerHealth() {
    return this.http.get<{ data: WorkerHealthSummary[] }>(`${this.base}/health/worker`)
  }

  runWorkerNow(storeId: string) {
    return this.http.post(`${this.base}/health/worker/${storeId}/run`, {})
  }

  getLastWorkerLog(storeId: string) {
    return this.http.get(`${this.base}/health/worker/${storeId}/last-log`)
  }

  getAdminUsers(params: Record<string, string | number> = {}) {
    let httpParams = new HttpParams()
    Object.entries(params).forEach(([k, v]) => (httpParams = httpParams.set(k, String(v))))
    return this.http.get(`${this.base}/users/admin/users`, { params: httpParams })
  }

  changeUserRole(userId: string, role: 'admin' | 'visitor') {
    return this.http.patch(`${this.base}/users/admin/users/${userId}/role`, { role })
  }
}
