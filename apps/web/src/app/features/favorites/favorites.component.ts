import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { ApiService } from '../../core/services/api.service'

interface FavoriteItem {
  product_id: string
  product_name: string
  brand_name: string
  image_url: string | null
  best_price: number | null
  best_price_discounted: number | null
  best_store: string | null
  max_discount_pct: number | null
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="container">
        <h1 class="page-title">Mis favoritos</h1>

        @if (loading()) {
          <div class="products-grid">
            @for (s of skeletons; track s) {
              <div class="product-card product-card--skeleton"></div>
            }
          </div>
        } @else if (favorites().length === 0) {
          <div class="empty-state">
            <p>Aún no tienes perfumes guardados.</p>
            <a routerLink="/search" class="btn btn--primary">Explorar perfumes</a>
          </div>
        } @else {
          <p class="results-count">{{ favorites().length }} perfume{{ favorites().length !== 1 ? 's' : '' }} guardado{{ favorites().length !== 1 ? 's' : '' }}</p>
          <div class="products-grid">
            @for (f of favorites(); track f.product_id) {
              <div class="product-card">
                <a [routerLink]="['/products', f.product_id]" class="product-card__link">
                  <div class="product-card__img">
                    @if (f.image_url) {
                      <img [src]="f.image_url" [alt]="f.product_name" loading="lazy" />
                    } @else {
                      <span class="product-card__placeholder">🌸</span>
                    }
                    @if (f.max_discount_pct) {
                      <span class="product-card__badge">-{{ f.max_discount_pct | number:'1.0-0' }}%</span>
                    }
                  </div>
                  <div class="product-card__body">
                    <p class="product-card__brand">{{ f.brand_name }}</p>
                    <h3 class="product-card__name">{{ f.product_name }}</h3>
                    <div class="product-card__prices">
                      @if (f.best_price_discounted) {
                        <span class="product-card__old">{{ f.best_price || 0 | currency:'CLP':'symbol-narrow':'1.0-0' }}</span>
                        <span class="product-card__current">{{ f.best_price_discounted | currency:'CLP':'symbol-narrow':'1.0-0' }}</span>
                      } @else {
                        <span class="product-card__current">{{ f.best_price || 0 | currency:'CLP':'symbol-narrow':'1.0-0' }}</span>
                      }
                    </div>
                    @if (f.best_store) {
                      <p class="product-card__store">en {{ f.best_store }}</p>
                    }
                  </div>
                </a>
                <button class="btn-remove" (click)="remove(f.product_id)" title="Quitar de favoritos">✕</button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
    .results-count { font-size: .875rem; color: var(--color-text-muted); margin-bottom: .75rem; }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .product-card {
      position: relative;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden;
      transition: box-shadow .2s, transform .2s;
      &:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
      &--skeleton {
        height: 260px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
    }
    .product-card__link { text-decoration: none; color: inherit; display: block; }
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
    .btn-remove {
      position: absolute; top: .4rem; left: .4rem;
      background: rgba(255,255,255,.9); border: 1px solid var(--color-border);
      border-radius: 50%; width: 1.5rem; height: 1.5rem;
      font-size: .75rem; cursor: pointer; color: var(--color-text-muted);
      display: flex; align-items: center; justify-content: center;
      &:hover { background: #ffebee; color: var(--color-danger); border-color: var(--color-danger); }
    }
    .empty-state {
      text-align: center; padding: 3rem; color: var(--color-text-muted);
      background: var(--color-surface); border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      p { margin-bottom: 1rem; }
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class FavoritesComponent implements OnInit {
  favorites = signal<FavoriteItem[]>([])
  loading = signal(true)
  skeletons = Array(8).fill(0)

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load()
  }

  private load() {
    this.loading.set(true)
    this.api.getFavorites().subscribe({
      next: (res) => {
        this.favorites.set(res.data as unknown as FavoriteItem[])
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  remove(productId: string) {
    this.api.removeFavorite(productId).subscribe(() => {
      this.favorites.update(list => list.filter(f => f.product_id !== productId))
    })
  }
}
