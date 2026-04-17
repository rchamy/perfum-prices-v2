import {
  Component,
  OnInit,
  OnDestroy,
  computed,
  signal,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink, ActivatedRoute, Router } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { Subject } from 'rxjs'
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators'
import { ApiService } from '../../core/services/api.service'
import type { ProductSummary } from '@perfum/shared'

interface FilterState {
  q: string
  gender: string
  store: string
  brand: string[]
  min_price: string
  max_price: string
  sort: string
  page: number
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="container search-layout">

        <!-- Sidebar filtros -->
        <aside class="filters-panel">
          <div class="filters-header">
            <h2>Filtros</h2>
            @if (hasActiveFilters()) {
              <button class="btn-clear-all" (click)="clearAllFilters()">Limpiar todo</button>
            }
          </div>

          <!-- Género -->
          <div class="filter-section">
            <h3>Género</h3>
            <label class="radio-label">
              <input type="radio" name="gender" [(ngModel)]="filters.gender" value="" (ngModelChange)="onFilterChange()" /> Todos
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" [(ngModel)]="filters.gender" value="male" (ngModelChange)="onFilterChange()" /> Hombre
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" [(ngModel)]="filters.gender" value="female" (ngModelChange)="onFilterChange()" /> Mujer
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" [(ngModel)]="filters.gender" value="unisex" (ngModelChange)="onFilterChange()" /> Unisex
            </label>
          </div>

          <!-- Tienda -->
          <div class="filter-section">
            <h3>Tienda</h3>
            <select class="filter-select" [(ngModel)]="filters.store" (ngModelChange)="onFilterChange()">
              <option value="">Todas las tiendas</option>
              @for (s of stores(); track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>
          </div>

          <!-- Marca (multi-select) -->
          @if (brands().length > 0) {
            <div class="filter-section">
              <h3>Marca</h3>
              <input
                class="filter-input"
                type="search"
                placeholder="Buscar marca…"
                [(ngModel)]="brandSearch"
                style="margin-bottom:.5rem"
              />
              <div class="brands-list">
                @for (b of filteredBrands(); track b) {
                  <label class="checkbox-label" [class.checked]="filters.brand.includes(b)">
                    <input
                      type="checkbox"
                      [checked]="filters.brand.includes(b)"
                      (change)="toggleBrand(b)"
                    /> {{ b }}
                  </label>
                }
              </div>
            </div>
          }

          <!-- Rango de precio -->
          <div class="filter-section">
            <h3>Precio (CLP)</h3>
            <div class="price-range">
              <input
                type="number"
                class="filter-input"
                placeholder="Mín"
                [(ngModel)]="filters.min_price"
                (ngModelChange)="onPriceChange()"
                min="0"
              />
              <span class="price-sep">—</span>
              <input
                type="number"
                class="filter-input"
                placeholder="Máx"
                [(ngModel)]="filters.max_price"
                (ngModelChange)="onPriceChange()"
                min="0"
              />
            </div>
          </div>

          <!-- Ordenar -->
          <div class="filter-section">
            <h3>Ordenar por</h3>
            <select class="filter-select" [(ngModel)]="filters.sort" (ngModelChange)="onFilterChange()">
              <option value="discount_desc">Mayor descuento</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="name_asc">Nombre A-Z</option>
            </select>
          </div>
        </aside>

        <!-- Contenido principal -->
        <main class="search-main">

          <!-- Barra de búsqueda -->
          <div class="search-bar-wrapper">
            <div class="search-input-wrap">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                class="search-input"
                type="search"
                placeholder="Buscar perfume, marca…"
                [(ngModel)]="filters.q"
                (ngModelChange)="onSearchChange($event)"
                autocomplete="off"
              />
              @if (filters.q) {
                <button class="btn-clear-input" (click)="clearSearch()">✕</button>
              }
            </div>
          </div>

          <!-- Chips de filtros activos -->
          @if (activeChips().length > 0) {
            <div class="active-chips">
              @for (chip of activeChips(); track chip.key) {
                <span class="chip">
                  {{ chip.label }}
                  <button (click)="removeChip(chip.key)">✕</button>
                </span>
              }
            </div>
          }

          <!-- Estado: cargando -->
          @if (loading()) {
            <div class="products-grid">
              @for (s of skeletons; track s) {
                <div class="product-card product-card--skeleton"></div>
              }
            </div>
          }

          <!-- Estado: sin resultados -->
          @else if (!loading() && products().length === 0) {
            <div class="empty-state">
              <p>No se encontraron perfumes con esos filtros.</p>
              @if (hasActiveFilters()) {
                <button class="btn btn--outline" (click)="clearAllFilters()">Quitar filtros</button>
              }
            </div>
          }

          <!-- Resultados -->
          @else {
            <div class="results-header">
              <p class="results-count">{{ total() }} resultado{{ total() !== 1 ? 's' : '' }}</p>
            </div>

            <div class="products-grid">
              @for (p of products(); track p.id) {
                <a class="product-card" [routerLink]="['/products', p.id]">
                  <div class="product-card__img">
                    @if (p.image_url) {
                      <img [src]="p.image_url" [alt]="p.name" loading="lazy" />
                    } @else {
                      <span class="product-card__placeholder">🌸</span>
                    }
                    @if (p.max_discount_pct) {
                      <span class="product-card__badge">-{{ p.max_discount_pct | number:'1.0-0' }}%</span>
                    }
                  </div>
                  <div class="product-card__body">
                    <p class="product-card__brand">{{ p.brand }}</p>
                    <h3 class="product-card__name">{{ p.name }}</h3>
                    <div class="product-card__prices">
                      @if (p.best_price_discounted) {
                        <span class="product-card__old">{{ p.best_price || 0 | currency:'CLP':'symbol-narrow':'1.0-0' }}</span>
                        <span class="product-card__current">{{ p.best_price_discounted | currency:'CLP':'symbol-narrow':'1.0-0' }}</span>
                      } @else {
                        <span class="product-card__current">{{ p.best_price || 0 | currency:'CLP':'symbol-narrow':'1.0-0' }}</span>
                      }
                    </div>
                    @if (p.best_store) {
                      <p class="product-card__store">en {{ p.best_store }}</p>
                    }
                  </div>
                </a>
              }
            </div>

            <!-- Paginación -->
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn--outline" [disabled]="filters.page <= 1" (click)="goToPage(filters.page - 1)">
                  ← Anterior
                </button>
                <span class="pagination__info">Página {{ filters.page }} de {{ totalPages() }}</span>
                <button class="btn btn--outline" [disabled]="filters.page >= totalPages()" (click)="goToPage(filters.page + 1)">
                  Siguiente →
                </button>
              </div>
            }
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .search-layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 2rem;
      align-items: start;
      padding-top: 2rem;
      padding-bottom: 3rem;
    }
    @media (max-width: 768px) {
      .search-layout { grid-template-columns: 1fr; }
      .filters-panel { order: 2; }
      .search-main { order: 1; }
    }

    /* Sidebar */
    .filters-panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      position: sticky;
      top: 4.5rem;
    }
    .filters-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      h2 { font-size: 1rem; font-weight: 700; }
    }
    .btn-clear-all {
      background: none; border: none; cursor: pointer;
      font-size: .8rem; color: var(--color-primary); padding: 0;
      &:hover { text-decoration: underline; }
    }
    .filter-section {
      margin-bottom: 1.25rem;
      h3 { font-size: .8rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); margin-bottom: .6rem; }
    }
    .radio-label {
      display: flex; align-items: center; gap: .5rem;
      font-size: .9rem; cursor: pointer; padding: .2rem 0;
      input[type=radio] { accent-color: var(--color-primary); }
    }
    .filter-select, .filter-input {
      width: 100%; padding: .45rem .6rem;
      border: 1px solid var(--color-border); border-radius: var(--radius);
      background: var(--color-bg); font-size: .875rem;
      &:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
    }
    .price-range {
      display: flex; align-items: center; gap: .5rem;
      .filter-input { flex: 1; }
      .price-sep { color: var(--color-text-muted); }
    }
    .brands-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: .25rem;
    }
    .checkbox-label {
      display: flex; align-items: center; gap: .5rem;
      font-size: .85rem; cursor: pointer; padding: .25rem .4rem;
      border-radius: var(--radius);
      transition: background .15s;
      input[type=checkbox] { accent-color: var(--color-primary); flex-shrink: 0; }
      &:hover { background: var(--color-primary-light); }
      &.checked { background: var(--color-primary-light); font-weight: 600; color: var(--color-primary); }
    }

    /* Search bar */
    .search-bar-wrapper { margin-bottom: 1rem; }
    .search-input-wrap {
      position: relative;
      .search-icon { position: absolute; left: .75rem; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); }
    }
    .search-input {
      width: 100%; padding: .65rem .65rem .65rem 2.5rem;
      border: 1px solid var(--color-border); border-radius: var(--radius);
      font-size: 1rem; background: var(--color-surface);
      &:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
      &::-webkit-search-cancel-button { display: none; }
    }
    .btn-clear-input {
      position: absolute; right: .75rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: var(--color-text-muted);
      font-size: .875rem; padding: 0;
      &:hover { color: var(--color-text); }
    }

    /* Active chips */
    .active-chips {
      display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .75rem;
    }
    .chip {
      display: inline-flex; align-items: center; gap: .4rem;
      background: var(--color-primary-light); color: var(--color-primary);
      font-size: .8rem; font-weight: 500; padding: .25rem .6rem;
      border-radius: 999px;
      button {
        background: none; border: none; cursor: pointer;
        color: var(--color-primary); padding: 0; line-height: 1; font-size: .7rem;
        &:hover { color: var(--color-danger); }
      }
    }

    /* Results header */
    .results-header { margin-bottom: .75rem; }
    .results-count { font-size: .875rem; color: var(--color-text-muted); }

    /* Product grid — same as HomeComponent */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .product-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden;
      text-decoration: none; color: inherit;
      transition: box-shadow .2s, transform .2s;
      &:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
      &--skeleton {
        height: 260px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
    }
    .product-card__img {
      position: relative; height: 140px;
      background: var(--color-primary-light);
      display: flex; align-items: center; justify-content: center;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .product-card__placeholder { font-size: 2.5rem; }
    .product-card__badge {
      position: absolute; top: .4rem; right: .4rem;
      background: var(--color-danger); color: #fff;
      font-size: .7rem; font-weight: 700; padding: .15rem .45rem;
      border-radius: 999px;
    }
    .product-card__body { padding: .75rem; }
    .product-card__brand { font-size: .7rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: .15rem; }
    .product-card__name { font-size: .875rem; font-weight: 600; line-height: 1.3; margin-bottom: .4rem; }
    .product-card__prices { display: flex; align-items: baseline; gap: .4rem; flex-wrap: wrap; }
    .product-card__old { font-size: .75rem; color: var(--color-text-muted); text-decoration: line-through; }
    .product-card__current { font-size: .95rem; font-weight: 700; color: var(--color-primary); }
    .product-card__store { font-size: .7rem; color: var(--color-text-muted); margin-top: .2rem; }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 3rem;
      color: var(--color-text-muted);
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      p { margin-bottom: 1rem; }
    }

    /* Pagination */
    .pagination {
      display: flex; align-items: center; justify-content: center;
      gap: 1rem; margin-top: 2rem;
    }
    .pagination__info { font-size: .875rem; color: var(--color-text-muted); }

    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class SearchComponent implements OnInit, OnDestroy {
  products = signal<ProductSummary[]>([])
  stores = signal<{ id: string; name: string }[]>([])
  brands = signal<string[]>([])
  loading = signal(true)
  total = signal(0)
  skeletons = Array(12).fill(0)
  brandSearch = ''

  private readonly PAGE_SIZE = 24
  private destroy$ = new Subject<void>()
  private search$ = new Subject<string>()
  private priceChange$ = new Subject<void>()

  filters: FilterState = {
    q: '',
    gender: '',
    store: '',
    brand: [],
    min_price: '',
    max_price: '',
    sort: 'discount_desc',
    page: 1,
  }

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)))

  hasActiveFilters = computed(() =>
    !!(this.filters.q || this.filters.gender || this.filters.store || this.filters.brand.length || this.filters.min_price || this.filters.max_price)
  )

  activeChips = computed(() => {
    const chips: { key: string; label: string }[] = []
    if (this.filters.q) chips.push({ key: 'q', label: `"${this.filters.q}"` })
    if (this.filters.gender) chips.push({ key: 'gender', label: this.genderLabel(this.filters.gender) })
    if (this.filters.store) {
      const s = this.stores().find(st => st.id === this.filters.store)
      if (s) chips.push({ key: 'store', label: s.name })
    }
    if (this.filters.brand.length) chips.push({ key: 'brand', label: this.filters.brand.length === 1 ? this.filters.brand[0] : `${this.filters.brand.length} marcas` })
    if (this.filters.min_price) chips.push({ key: 'min_price', label: `Desde $${Number(this.filters.min_price).toLocaleString('es-CL')}` })
    if (this.filters.max_price) chips.push({ key: 'max_price', label: `Hasta $${Number(this.filters.max_price).toLocaleString('es-CL')}` })
    return chips
  })

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    // Load stores and brands for filter panel
    this.api.getStores().subscribe({ next: (res) => this.stores.set(res.data) })
    this.api.getBrands().subscribe({ next: (res) => this.brands.set(res.data) })

    // Debounce search input
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
      this.filters.page = 1
      this.syncUrl()
      this.fetchProducts()
    })

    // Debounce price range inputs
    this.priceChange$.pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
      this.filters.page = 1
      this.syncUrl()
      this.fetchProducts()
    })

    // Sync from URL on init
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.filters.q = params['q'] ?? ''
      this.filters.gender = params['gender'] ?? ''
      this.filters.store = params['store'] ?? ''
      this.filters.brand = params['brand'] ? params['brand'].split(',') : []
      this.filters.min_price = params['min_price'] ?? ''
      this.filters.max_price = params['max_price'] ?? ''
      this.filters.sort = params['sort'] ?? 'discount_desc'
      this.filters.page = Number(params['page'] ?? 1)
      this.fetchProducts()
    })
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  onSearchChange(value: string) {
    this.search$.next(value)
  }

  onFilterChange() {
    this.filters.page = 1
    this.syncUrl()
    this.fetchProducts()
  }

  onPriceChange() {
    this.priceChange$.next()
  }

  clearSearch() {
    this.filters.q = ''
    this.filters.page = 1
    this.syncUrl()
    this.fetchProducts()
  }

  clearAllFilters() {
    this.filters = { q: '', gender: '', store: '', brand: [], min_price: '', max_price: '', sort: 'discount_desc', page: 1 }
    this.brandSearch = ''
    this.syncUrl()
    this.fetchProducts()
  }

  removeChip(key: string) {
    if (key === 'brand') {
      this.filters.brand = []
    } else {
      (this.filters as any)[key] = ''
    }
    this.filters.page = 1
    this.syncUrl()
    this.fetchProducts()
  }

  toggleBrand(brand: string) {
    const idx = this.filters.brand.indexOf(brand)
    if (idx >= 0) {
      this.filters.brand = this.filters.brand.filter(b => b !== brand)
    } else {
      this.filters.brand = [...this.filters.brand, brand]
    }
    this.filters.page = 1
    this.syncUrl()
    this.fetchProducts()
  }

  filteredBrands() {
    if (!this.brandSearch) return this.brands()
    const s = this.brandSearch.toLowerCase()
    return this.brands().filter(b => b.toLowerCase().includes(s))
  }

  goToPage(page: number) {
    this.filters.page = page
    this.syncUrl()
    this.fetchProducts()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  private fetchProducts() {
    this.loading.set(true)
    const f: Record<string, string | number> = { sort: this.filters.sort, limit: this.PAGE_SIZE, offset: (this.filters.page - 1) * this.PAGE_SIZE }
    if (this.filters.q) f['q'] = this.filters.q
    if (this.filters.gender) f['gender'] = this.filters.gender
    if (this.filters.store) f['store'] = this.filters.store
    if (this.filters.brand.length) f['brand'] = this.filters.brand.join(',')
    if (this.filters.min_price) f['min_price'] = this.filters.min_price
    if (this.filters.max_price) f['max_price'] = this.filters.max_price

    this.api.getProducts(f).subscribe({
      next: (res) => {
        this.products.set(res.data)
        this.total.set(res.total ?? res.data.length)
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  private syncUrl() {
    const queryParams: Record<string, string | null> = {}
    if (this.filters.q) queryParams['q'] = this.filters.q
    if (this.filters.gender) queryParams['gender'] = this.filters.gender
    if (this.filters.store) queryParams['store'] = this.filters.store
    if (this.filters.brand.length) queryParams['brand'] = this.filters.brand.join(',')
    if (this.filters.min_price) queryParams['min_price'] = this.filters.min_price
    if (this.filters.max_price) queryParams['max_price'] = this.filters.max_price
    if (this.filters.sort !== 'discount_desc') queryParams['sort'] = this.filters.sort
    if (this.filters.page > 1) queryParams['page'] = String(this.filters.page)
    this.router.navigate([], { queryParams, replaceUrl: true })
  }

  private genderLabel(g: string): string {
    return { male: 'Hombre', female: 'Mujer', unisex: 'Unisex' }[g] ?? g
  }
}
