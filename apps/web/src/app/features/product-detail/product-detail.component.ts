import { Component, OnInit, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink, ActivatedRoute } from '@angular/router'
import { ApiService } from '../../core/services/api.service'
import { SupabaseService } from '../../core/services/supabase.service'
import { PriceChartComponent } from './price-chart.component'
import type { ProductDetail } from '@perfum/shared'

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PriceChartComponent],
  template: `
    <div class="page">
      <div class="container">

        @if (loading()) {
          <div class="skeleton-detail">
            <div class="sk-img"></div>
            <div class="sk-body">
              <div class="sk-line sk-line--sm"></div>
              <div class="sk-line sk-line--lg"></div>
              <div class="sk-line sk-line--md"></div>
            </div>
          </div>
        } @else if (error()) {
          <div class="alert alert--error" style="margin-top:2rem">{{ error() }}</div>
        } @else if (product()) {
          <!-- Breadcrumb -->
          <nav class="breadcrumb">
            <a routerLink="/">Inicio</a>
            <span>/</span>
            <a routerLink="/search">Perfumes</a>
            <span>/</span>
            <span>{{ product()!.name }}</span>
          </nav>

          <!-- Hero del producto -->
          <div class="product-hero">
            <div class="product-hero__img">
              @if (product()!.image_url) {
                <img [src]="product()!.image_url" [alt]="product()!.name" />
              } @else {
                <span class="product-hero__placeholder">🌸</span>
              }
            </div>

            <div class="product-hero__info">
              <p class="product-brand">{{ product()!.brand }}</p>
              <h1 class="product-name">{{ product()!.name }}</h1>
              <p class="product-gender badge badge--{{ product()!.gender }}">
                {{ genderLabel(product()!.gender) }}
              </p>

              @if (product()!.description) {
                <p class="product-desc">{{ product()!.description }}</p>
              }

              <!-- Notas olfativas -->
              @if (product()!.notes?.length) {
                <div class="notes-section">
                  <h3>Notas olfativas</h3>
                  <div class="notes-chips">
                    @for (note of product()!.notes; track note.name) {
                      <span class="note-chip note-chip--{{ note.type }}">{{ note.name }}</span>
                    }
                  </div>
                </div>
              }

              <!-- Precio histórico mínimo -->
              @if (product()!.min_historical_price) {
                <p class="historical-min">
                  Mínimo histórico:
                  <strong>{{ product()!.min_historical_price | currency:'CLP':'symbol-narrow':'1.0-0' }}</strong>
                </p>
              }

              <!-- Acción favorito -->
              <div class="product-actions">
                <button
                  class="btn btn--outline"
                  [class.btn--primary]="isFavorite()"
                  (click)="toggleFavorite()"
                  [disabled]="!user()"
                  [title]="user() ? '' : 'Inicia sesión para guardar favoritos'"
                >
                  {{ isFavorite() ? '♥ Guardado' : '♡ Guardar' }}
                </button>
                <a routerLink="/alerts" class="btn btn--outline">
                  🔔 Crear alerta de precio
                </a>
              </div>

              @if (!user()) {
                <p class="login-hint"><a routerLink="/auth/login">Inicia sesión</a> para guardar favoritos y crear alertas.</p>
              }
            </div>
          </div>

          <!-- Tabla de precios por tienda -->
          <section class="prices-section">
            <h2>Precios por tienda</h2>
            @if (product()!.prices?.length) {
              <div class="prices-table-wrap">
                <table class="prices-table">
                  <thead>
                    <tr>
                      <th>Tienda</th>
                      <th>Precio normal</th>
                      <th>Precio oferta</th>
                      <th>Descuento</th>
                      <th>Condición</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of sortedPrices(); track p.store_id) {
                      <tr [class.row--best]="p === bestPrice()">
                        <td class="td-store">
                          @if (p.store_logo) {
                            <img [src]="p.store_logo" [alt]="p.store_name" class="store-logo" />
                          }
                          {{ p.store_name }}
                          @if (p === bestPrice()) {
                            <span class="badge badge--success best-badge">Mejor precio</span>
                          }
                        </td>
                        <td>{{ p.price_normal | currency:'CLP':'symbol-narrow':'1.0-0' }}</td>
                        <td>
                          @if (p.price_discounted) {
                            <strong class="price-off">{{ p.price_discounted | currency:'CLP':'symbol-narrow':'1.0-0' }}</strong>
                          } @else {
                            <span class="text-muted">—</span>
                          }
                        </td>
                        <td>
                          @if (discountPct(p) > 0) {
                            <span class="badge badge--danger">-{{ discountPct(p) | number:'1.0-0' }}%</span>
                          } @else {
                            <span class="text-muted">—</span>
                          }
                        </td>
                        <td>
                          <span class="text-muted payment-label">{{ p.payment_method || p.discount_label || '—' }}</span>
                        </td>
                        <td>
                          <a [href]="p.product_url" target="_blank" rel="noopener noreferrer" class="btn btn--outline btn--sm">
                            Ir a tienda →
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="prices-note">Precios actualizados {{ lastUpdated() }}</p>
            } @else {
              <div class="empty-state">
                <p>Aún no hay precios registrados para este perfume.</p>
              </div>
            }
          </section>

          <!-- Gráfico de tendencia -->
          <app-price-chart [productId]="product()!.id" />
        }
      </div>
    </div>
  `,
  styles: [`
    /* Breadcrumb */
    .breadcrumb {
      display: flex; align-items: center; gap: .5rem;
      font-size: .85rem; color: var(--color-text-muted);
      margin: 1.5rem 0 1.25rem;
      a { color: var(--color-primary); text-decoration: none; &:hover { text-decoration: underline; } }
    }

    /* Hero */
    .product-hero {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 2.5rem;
      margin-bottom: 2.5rem;
      align-items: start;
    }
    @media (max-width: 700px) {
      .product-hero { grid-template-columns: 1fr; }
    }
    .product-hero__img {
      background: var(--color-primary-light);
      border-radius: var(--radius-lg);
      aspect-ratio: 1;
      display: flex; align-items: center; justify-content: center; overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .product-hero__placeholder { font-size: 5rem; }
    .product-brand { font-size: .85rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: .25rem; }
    .product-name { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800; line-height: 1.2; margin-bottom: .5rem; }
    .product-gender { display: inline-block; margin-bottom: .75rem; }
    .product-desc { font-size: .95rem; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 1rem; }

    .notes-section {
      margin-bottom: 1rem;
      h3 { font-size: .8rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); margin-bottom: .5rem; }
    }
    .notes-chips { display: flex; flex-wrap: wrap; gap: .4rem; }
    .note-chip {
      font-size: .75rem; padding: .2rem .65rem;
      border-radius: 999px; background: var(--color-surface);
      border: 1px solid var(--color-border);
      &--top { background: #fff3e0; border-color: #ffb74d; }
      &--heart { background: #fce4ec; border-color: #f48fb1; }
      &--base { background: #ede7f6; border-color: #b39ddb; }
    }

    .historical-min {
      font-size: .875rem; color: var(--color-text-muted); margin-bottom: 1rem;
      strong { color: var(--color-success, #2e7d32); }
    }

    .product-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-bottom: .75rem; }
    .login-hint { font-size: .8rem; color: var(--color-text-muted); a { color: var(--color-primary); } }

    /* Prices table */
    .prices-section {
      h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
    }
    .prices-table-wrap { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--color-border); }
    .prices-table {
      width: 100%; border-collapse: collapse;
      th, td { padding: .75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); font-size: .875rem; }
      th { background: var(--color-surface); font-weight: 600; color: var(--color-text-muted); font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: var(--color-primary-light); }
      .row--best td { background: #f0fdf4; }
    }
    .td-store { display: flex; align-items: center; gap: .6rem; }
    .store-logo { width: 24px; height: 24px; object-fit: contain; border-radius: 4px; }
    .best-badge { margin-left: .25rem; }
    .price-off { color: var(--color-primary); }
    .text-muted { color: var(--color-text-muted); }
    .payment-label { font-size: .8rem; }
    .prices-note { font-size: .75rem; color: var(--color-text-muted); margin-top: .75rem; }
    .btn--sm { padding: .3rem .7rem; font-size: .8rem; }

    /* Badge variants */
    .badge--male { background: #e3f2fd; color: #1565c0; }
    .badge--female { background: #fce4ec; color: #ad1457; }
    .badge--unisex { background: #f3e5f5; color: #6a1b9a; }
    .badge--success { background: #e8f5e9; color: #2e7d32; }
    .badge--danger { background: #ffebee; color: #c62828; }

    /* Skeleton */
    .skeleton-detail {
      display: grid; grid-template-columns: 300px 1fr; gap: 2.5rem; margin-top: 2rem;
    }
    .sk-img {
      aspect-ratio: 1; border-radius: var(--radius-lg);
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    .sk-body { display: flex; flex-direction: column; gap: 1rem; padding-top: 1rem; }
    .sk-line {
      height: 1rem; border-radius: 4px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
      &--sm { width: 30%; }
      &--lg { width: 70%; height: 2rem; }
      &--md { width: 50%; }
    }
    .empty-state {
      text-align: center; padding: 3rem; color: var(--color-text-muted);
      background: var(--color-surface); border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class ProductDetailComponent implements OnInit {
  product = signal<ProductDetail | null>(null)
  loading = signal(true)
  error = signal('')
  user = signal<any>(null)
  isFavorite = signal(false)

  sortedPrices = computed(() => {
    const prices = this.product()?.prices ?? []
    return [...prices].sort((a, b) => {
      const pa = a.price_discounted ?? a.price_normal
      const pb = b.price_discounted ?? b.price_normal
      return pa - pb
    })
  })

  bestPrice = computed(() => this.sortedPrices()[0] ?? null)

  lastUpdated = computed(() => {
    const first = this.product()?.prices?.[0]
    if (!first?.captured_at) return ''
    const d = new Date(first.captured_at)
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  })

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!

    // Get current user for favorite/alert actions
    const { data } = await this.supabase.getSession()
    this.user.set(data.session?.user ?? null)

    // Load product
    this.api.getProduct(id).subscribe({
      next: (res) => {
        this.product.set(res.product)
        this.loading.set(false)
        if (this.user()) this.checkFavorite(id)
      },
      error: () => {
        this.error.set('No se encontró el perfume.')
        this.loading.set(false)
      },
    })
  }

  private checkFavorite(productId: string) {
    this.api.getFavorites().subscribe({
      next: (res) => {
        this.isFavorite.set(res.data.some((f: any) => f.product_id === productId))
      },
    })
  }

  toggleFavorite() {
    const id = this.product()?.id
    if (!id) return
    if (this.isFavorite()) {
      this.api.removeFavorite(id).subscribe(() => this.isFavorite.set(false))
    } else {
      this.api.addFavorite(id).subscribe(() => this.isFavorite.set(true))
    }
  }

  discountPct(p: { price_normal: number; price_discounted: number | null }): number {
    if (!p.price_discounted || p.price_normal <= 0) return 0
    return Math.round(((p.price_normal - p.price_discounted) / p.price_normal) * 100)
  }

  genderLabel(g: string): string {
    return { male: 'Hombre', female: 'Mujer', unisex: 'Unisex' }[g] ?? g
  }
}
