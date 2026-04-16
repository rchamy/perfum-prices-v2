import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { ApiService } from '../../core/services/api.service'
import type { ProductSummary } from '@perfum/shared'

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="container">
        <!-- Hero -->
        <section class="hero">
          <h1>Encuentra el mejor precio<br><span>de tu perfume favorito</span></h1>
          <p>Comparamos precios en tiempo real de las principales tiendas de Chile.</p>
          <a routerLink="/search" class="btn btn--primary btn--lg">Buscar perfumes</a>
        </section>

        <!-- Top descuentos -->
        <section>
          <h2 class="section-title">🔥 Mayores descuentos ahora</h2>

          @if (loading()) {
            <div class="products-grid">
              @for (s of skeletons; track s) {
                <div class="product-card product-card--skeleton"></div>
              }
            </div>
          } @else if (products().length === 0) {
            <div class="empty-state">
              <p>Aún no hay precios cargados. El worker comenzará a recopilar datos pronto.</p>
            </div>
          } @else {
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
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      text-align: center;
      padding: 3.5rem 0 3rem;
      h1 {
        font-size: clamp(1.75rem, 4vw, 2.75rem);
        font-weight: 800;
        line-height: 1.2;
        margin-bottom: 1rem;
        span { color: var(--color-primary); }
      }
      p { font-size: 1.1rem; color: var(--color-text-muted); margin-bottom: 1.5rem; }
    }
    .section-title {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .product-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      transition: box-shadow .2s, transform .2s;
      &:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
      &--skeleton {
        height: 280px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
    }
    .product-card__img {
      position: relative;
      height: 160px;
      background: var(--color-primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .product-card__placeholder { font-size: 3rem; }
    .product-card__badge {
      position: absolute;
      top: .5rem;
      right: .5rem;
      background: var(--color-danger);
      color: #fff;
      font-size: .75rem;
      font-weight: 700;
      padding: .2rem .5rem;
      border-radius: 999px;
    }
    .product-card__body { padding: .875rem; }
    .product-card__brand { font-size: .75rem; color: var(--color-text-muted); margin-bottom: .2rem; text-transform: uppercase; letter-spacing: .05em; }
    .product-card__name { font-size: .9rem; font-weight: 600; margin-bottom: .5rem; line-height: 1.3; }
    .product-card__prices { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
    .product-card__old { font-size: .8rem; color: var(--color-text-muted); text-decoration: line-through; }
    .product-card__current { font-size: 1rem; font-weight: 700; color: var(--color-primary); }
    .product-card__store { font-size: .75rem; color: var(--color-text-muted); margin-top: .25rem; }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-muted);
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `]
})
export class HomeComponent implements OnInit {
  products = signal<ProductSummary[]>([])
  loading = signal(true)
  skeletons = Array(8).fill(0)

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProducts({ sort: 'discount_desc', limit: 20 }).subscribe({
      next: (res) => { this.products.set(res.data); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
  }
}
