import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../../core/services/api.service'

interface StoreRow {
  id: string
  name: string
  url: string
  logo_url: string | null
  method: string
  scrape_frequency_minutes: number
  is_active: boolean
  country: string | null
}

type FormMode = 'create' | 'edit'

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Tiendas</h1>
          <button class="btn btn--primary" (click)="openCreate()">+ Agregar tienda</button>
        </div>

        <!-- Form drawer -->
        @if (showForm()) {
          <div class="modal-backdrop" (click)="closeForm()">
            <div class="modal-card card" (click)="$event.stopPropagation()">
              <h2>{{ mode() === 'create' ? 'Nueva tienda' : 'Editar tienda' }}</h2>

              @if (formError()) {
                <div class="alert alert--error">{{ formError() }}</div>
              }

              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre *</label>
                  <input type="text" [(ngModel)]="form.name" placeholder="Paris, Falabella…" />
                </div>
                <div class="form-group">
                  <label>URL base *</label>
                  <input type="url" [(ngModel)]="form.url" placeholder="https://www.paris.cl" />
                </div>
                <div class="form-group">
                  <label>Logo URL</label>
                  <input type="url" [(ngModel)]="form.logo_url" placeholder="https://…/logo.png" />
                </div>
                <div class="form-group">
                  <label>Método</label>
                  <select [(ngModel)]="form.method">
                    <option value="scraper">Scraper (Puppeteer)</option>
                    <option value="api">API</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Frecuencia (minutos)</label>
                  <input type="number" [(ngModel)]="form.scrape_frequency_minutes" min="5" />
                </div>
                <div class="form-group">
                  <label>País</label>
                  <input type="text" [(ngModel)]="form.country" placeholder="CL" maxlength="2" />
                </div>
              </div>

              <div class="form-actions">
                <button class="btn btn--outline" (click)="closeForm()">Cancelar</button>
                <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
                  @if (saving()) { <span class="spinner"></span> } @else { Guardar }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Test scrape modal -->
        @if (showTest()) {
          <div class="modal-backdrop" (click)="showTest.set(false)">
            <div class="modal-card card" (click)="$event.stopPropagation()">
              <h2>Probar selectores — {{ testStore()?.name }}</h2>
              <p class="section-desc">Ingresa la URL del producto y los selectores CSS para verificar la extracción.</p>

              <div class="form-group">
                <label>URL del producto</label>
                <input type="url" [(ngModel)]="testUrl" placeholder="https://www.paris.cl/perfume/…" />
              </div>

              @if (testResults().length > 0) {
                <table class="test-table">
                  <thead><tr><th>Campo</th><th>Valor extraído</th><th>Error</th></tr></thead>
                  <tbody>
                    @for (r of testResults(); track r.field) {
                      <tr>
                        <td>{{ r.field }}</td>
                        <td>{{ r.value ?? '—' }}</td>
                        <td class="td-error">{{ r.error ?? '' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }

              <div class="form-actions">
                <button class="btn btn--outline" (click)="showTest.set(false)">Cerrar</button>
                <button class="btn btn--primary" (click)="runTest()" [disabled]="testLoading() || !testUrl">
                  @if (testLoading()) { <span class="spinner"></span> } @else { Ejecutar prueba }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Modal URLs rastreadas -->
        @if (showUrls()) {
          <div class="modal-backdrop" (click)="showUrls.set(false)">
            <div class="modal-card modal-card--lg card" (click)="$event.stopPropagation()">
              <h2>URLs rastreadas — {{ urlsStore()?.name }}</h2>
              <p class="section-desc">Agrega la URL de cada producto que quieras rastrear en esta tienda. El worker obtendrá el nombre y precio en el próximo ciclo.</p>

              @if (urlsError()) {
                <div class="alert alert--error">{{ urlsError() }}</div>
              }

              <div class="url-add-form">
                <input type="url" class="filter-input" [(ngModel)]="newProductUrl"
                  placeholder="https://www.paris.cl/perfume/carolina-herrera-212-vip…"
                  (keydown.enter)="addUrl()" />
                <button class="btn btn--primary btn--sm" (click)="addUrl()" [disabled]="addingUrl() || !newProductUrl">
                  @if (addingUrl()) { <span class="spinner"></span> } @else { + Agregar }
                </button>
              </div>

              @if (urlsLoading()) {
                <div class="sk-table" style="height:80px;margin-top:.75rem"></div>
              } @else if (storeProductUrls().length === 0) {
                <p class="text-muted" style="text-align:center;padding:1.5rem">No hay URLs registradas aún.</p>
              } @else {
                <div class="urls-list">
                  @for (sp of storeProductUrls(); track sp.id) {
                    <div class="url-item">
                      <div class="url-item__info">
                        <p class="url-item__name">{{ sp.products?.name ?? 'Sin nombre' }}</p>
                        <a [href]="sp.product_url" target="_blank" rel="noopener" class="url-item__url">{{ sp.product_url }}</a>
                        @if (sp.last_scraped_at) {
                          <span class="text-muted" style="font-size:.75rem">Último scrape: {{ sp.last_scraped_at | date:'dd/MM HH:mm' }}</span>
                        }
                      </div>
                      <button class="btn-icon btn-icon--danger" (click)="removeUrl(sp.id)" title="Eliminar">✕</button>
                    </div>
                  }
                </div>
              }

              <div class="form-actions">
                <button class="btn btn--outline" (click)="showUrls.set(false)">Cerrar</button>
              </div>
            </div>
          </div>
        }

        <!-- Tabla de tiendas -->
        @if (loading()) {
          <div class="sk-table"></div>
        } @else if (stores().length === 0) {
          <div class="empty-state"><p>No hay tiendas configuradas.</p></div>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tienda</th>
                  <th>Método</th>
                  <th>Frecuencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (s of stores(); track s.id) {
                  <tr>
                    <td class="td-store">
                      @if (s.logo_url) {
                        <img [src]="s.logo_url" [alt]="s.name" class="store-logo" />
                      }
                      <div>
                        <strong>{{ s.name }}</strong>
                        <p class="store-url">{{ s.url }}</p>
                      </div>
                    </td>
                    <td><span class="badge">{{ s.method }}</span></td>
                    <td>{{ s.scrape_frequency_minutes }} min</td>
                    <td>
                      <span class="badge" [class.badge--success]="s.is_active" [class.badge--muted]="!s.is_active">
                        {{ s.is_active ? 'Activa' : 'Inactiva' }}
                      </span>
                    </td>
                    <td class="td-actions">
                      <button class="btn btn--outline btn--sm" (click)="openEdit(s)">Editar</button>
                      @if (s.method === 'scraper') {
                        <button class="btn btn--outline btn--sm" (click)="openUrls(s)">URLs</button>
                        <button class="btn btn--outline btn--sm" (click)="openTest(s)">Probar</button>
                      }
                      <button class="btn btn--sm" [class.btn--outline]="s.is_active" [class.btn--primary]="!s.is_active"
                        (click)="toggle(s)">{{ s.is_active ? 'Desactivar' : 'Activar' }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 700; }
    .section-desc { font-size: .875rem; color: var(--color-text-muted); margin-bottom: 1rem; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal-card { width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.25rem; } }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    @media (max-width: 500px) { .form-grid { grid-template-columns: 1fr; } }
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }

    .table-wrap { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--color-border); }
    .data-table {
      width: 100%; border-collapse: collapse;
      th, td { padding: .75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); font-size: .875rem; }
      th { background: var(--color-surface); font-weight: 600; color: var(--color-text-muted); font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: var(--color-primary-light); }
    }
    .td-store { display: flex; align-items: center; gap: .75rem; }
    .store-logo { width: 32px; height: 32px; object-fit: contain; border-radius: 4px; flex-shrink: 0; }
    .store-url { font-size: .75rem; color: var(--color-text-muted); }
    .td-actions { display: flex; gap: .4rem; flex-wrap: wrap; }
    .btn--sm { padding: .3rem .7rem; font-size: .8rem; }

    .badge--success { background: #e8f5e9; color: #2e7d32; }
    .badge--muted { background: #f5f5f5; color: #9e9e9e; }

    .test-table {
      width: 100%; border-collapse: collapse; margin-bottom: 1rem;
      th, td { padding: .5rem .75rem; border: 1px solid var(--color-border); font-size: .85rem; }
      th { background: var(--color-surface); font-weight: 600; }
    }
    .td-error { color: var(--color-danger); font-size: .8rem; }

    .modal-card--lg { max-width: 680px; }
    .url-add-form { display: flex; gap: .5rem; margin-bottom: 1rem; .filter-input { flex: 1; } }
    .filter-input { padding: .45rem .6rem; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: .875rem; &:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; } }
    .urls-list { display: flex; flex-direction: column; gap: .5rem; max-height: 320px; overflow-y: auto; margin-bottom: 1rem; }
    .url-item { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; padding: .6rem .75rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius); }
    .url-item__info { flex: 1; min-width: 0; }
    .url-item__name { font-size: .875rem; font-weight: 500; margin-bottom: .15rem; }
    .url-item__url { font-size: .75rem; color: var(--color-primary); word-break: break-all; text-decoration: none; &:hover { text-decoration: underline; } }
    .text-muted { color: var(--color-text-muted); }
    .sk-table { height: 200px; border-radius: var(--radius-lg); background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .empty-state { text-align: center; padding: 3rem; color: var(--color-text-muted); background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class StoresComponent implements OnInit {
  stores = signal<StoreRow[]>([])
  loading = signal(true)
  showForm = signal(false)
  mode = signal<FormMode>('create')
  saving = signal(false)
  formError = signal('')
  showTest = signal(false)
  testStore = signal<StoreRow | null>(null)
  testUrl = ''
  testLoading = signal(false)
  testResults = signal<{ field: string; value: string | null; error: string | null }[]>([])
  showUrls = signal(false)
  urlsStore = signal<StoreRow | null>(null)
  storeProductUrls = signal<any[]>([])
  urlsLoading = signal(false)
  urlsError = signal('')
  newProductUrl = ''
  addingUrl = signal(false)
  private editingId: string | null = null

  form = { name: '', url: '', logo_url: '', method: 'scraper', scrape_frequency_minutes: 60, country: 'CL' }

  constructor(private api: ApiService) {}

  ngOnInit() { this.load() }

  private load() {
    this.loading.set(true)
    this.api.getStores(true).subscribe({
      next: (res) => { this.stores.set(res.data); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
  }

  openCreate() {
    this.mode.set('create')
    this.editingId = null
    this.form = { name: '', url: '', logo_url: '', method: 'scraper', scrape_frequency_minutes: 60, country: 'CL' }
    this.formError.set('')
    this.showForm.set(true)
  }

  openEdit(s: StoreRow) {
    this.mode.set('edit')
    this.editingId = s.id
    this.form = { name: s.name, url: s.url, logo_url: s.logo_url ?? '', method: s.method, scrape_frequency_minutes: s.scrape_frequency_minutes, country: s.country ?? 'CL' }
    this.formError.set('')
    this.showForm.set(true)
  }

  closeForm() { this.showForm.set(false) }

  save() {
    if (!this.form.name || !this.form.url) { this.formError.set('Nombre y URL son requeridos.'); return }
    this.saving.set(true)
    this.formError.set('')
    const body = { ...this.form, scrape_frequency_minutes: Number(this.form.scrape_frequency_minutes) }
    const op = this.mode() === 'create'
      ? this.api.createStore(body)
      : this.api.updateStore(this.editingId!, body)
    op.subscribe({
      next: () => { this.closeForm(); this.load() },
      error: (err) => { this.formError.set(err.error?.error ?? 'Error al guardar.'); this.saving.set(false) },
    })
  }

  toggle(s: StoreRow) {
    this.api.toggleStore(s.id).subscribe({ next: () => this.load() })
  }

  openUrls(s: StoreRow) {
    this.urlsStore.set(s)
    this.newProductUrl = ''
    this.urlsError.set('')
    this.showUrls.set(true)
    this.loadUrls(s.id)
  }

  private loadUrls(storeId: string) {
    this.urlsLoading.set(true)
    this.api.getStoreProducts(storeId).subscribe({
      next: (res) => { this.storeProductUrls.set(res.data); this.urlsLoading.set(false) },
      error: () => this.urlsLoading.set(false),
    })
  }

  addUrl() {
    const url = this.newProductUrl.trim()
    if (!url || !this.urlsStore()) return
    this.addingUrl.set(true)
    this.urlsError.set('')
    this.api.addStoreProductUrl(this.urlsStore()!.id, url).subscribe({
      next: () => {
        this.newProductUrl = ''
        this.addingUrl.set(false)
        this.loadUrls(this.urlsStore()!.id)
      },
      error: (err) => {
        this.urlsError.set(err.error?.error ?? 'Error al agregar la URL.')
        this.addingUrl.set(false)
      },
    })
  }

  removeUrl(spId: string) {
    this.api.removeStoreProductUrl(this.urlsStore()!.id, spId).subscribe({
      next: () => this.loadUrls(this.urlsStore()!.id),
    })
  }

  openTest(s: StoreRow) {
    this.testStore.set(s)
    this.testUrl = ''
    this.testResults.set([])
    this.showTest.set(true)
  }

  runTest() {
    if (!this.testUrl) return
    this.testLoading.set(true)
    this.testResults.set([])
    this.api.testScrape({ url: this.testUrl, store_id: this.testStore()?.id }).subscribe({
      next: (res: any) => { this.testResults.set(res.results ?? []); this.testLoading.set(false) },
      error: (err) => { this.testResults.set([{ field: 'error', value: null, error: err.error?.error ?? 'Error' }]); this.testLoading.set(false) },
    })
  }
}
