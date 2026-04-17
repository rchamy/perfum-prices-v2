import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../core/services/api.service'
import type { Alert, CreateAlertDto } from '@perfum/shared'

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Mis alertas de precio</h1>
          <button class="btn btn--primary" (click)="openCreate()">+ Nueva alerta</button>
        </div>

        <!-- Modal / Form crear/editar alerta -->
        @if (showForm()) {
          <div class="modal-backdrop" (click)="closeForm()">
            <div class="modal-card card" (click)="$event.stopPropagation()">
              <h2>{{ editing() ? 'Editar alerta' : 'Nueva alerta' }}</h2>

              @if (formError()) {
                <div class="alert alert--error">{{ formError() }}</div>
              }

              <div class="form-group">
                <label>Perfume</label>
                <input type="text" [(ngModel)]="form.product_search" (ngModelChange)="searchProduct($event)"
                  placeholder="Buscar por nombre o marca…" autocomplete="off" />
                @if (productResults().length > 0) {
                  <ul class="dropdown">
                    @for (p of productResults(); track p.id) {
                      <li (click)="selectProduct(p)">{{ p.brand }} — {{ p.name }}</li>
                    }
                  </ul>
                }
                @if (form.product_id) {
                  <p class="selected-product">✓ {{ form.product_label }}</p>
                }
              </div>

              <div class="form-group">
                <label>Tipo de umbral</label>
                <select [(ngModel)]="form.threshold_type">
                  <option value="percentage">Porcentaje de descuento</option>
                  <option value="fixed_price">Precio fijo (máximo)</option>
                </select>
              </div>

              <div class="form-group">
                <label>
                  @if (form.threshold_type === 'percentage') { Descuento mínimo (%) }
                  @else { Precio máximo (CLP) }
                </label>
                <input type="number" [(ngModel)]="form.threshold_value" min="1"
                  [placeholder]="form.threshold_type === 'percentage' ? 'Ej: 20' : 'Ej: 30000'" />
              </div>

              <div class="form-group">
                <label>Canal de notificación</label>
                <select [(ngModel)]="form.notification_channel">
                  <option value="email">Email</option>
                  <option value="telegram">Telegram</option>
                  <option value="both">Ambos</option>
                </select>
              </div>

              <div class="form-actions">
                <button class="btn btn--outline" (click)="closeForm()">Cancelar</button>
                <button class="btn btn--primary" (click)="saveAlert()" [disabled]="saving() || !form.product_id">
                  @if (saving()) { <span class="spinner"></span> } @else { Guardar }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Lista de alertas -->
        @if (loading()) {
          <div class="alert-list">
            @for (s of skeletons; track s) {
              <div class="alert-item alert-item--skeleton"></div>
            }
          </div>
        } @else if (alerts().length === 0) {
          <div class="empty-state">
            <p>No tienes alertas configuradas.</p>
            <p>Crea una alerta y te avisaremos cuando baje el precio de un perfume.</p>
          </div>
        } @else {
          <div class="alert-list">
            @for (a of alerts(); track a.id) {
              <div class="alert-item" [class.alert-item--inactive]="!a.is_active">
                <div class="alert-item__info">
                  <h3 class="alert-item__name">{{ a.products?.brands?.name ? a.products.brands.name + ' — ' : '' }}{{ a.products?.name || a.product_id }}</h3>
                  <p class="alert-item__condition">
                    @if (a.threshold_type === 'percentage') {
                      Descuento ≥ {{ a.threshold_value }}%
                    } @else {
                      Precio ≤ {{ a.threshold_value | currency:'CLP':'symbol-narrow':'1.0-0' }}
                    }
                    · {{ channelLabel(a.notification_channel) }}
                  </p>
                  @if (a.last_triggered_at) {
                    <p class="alert-item__last">Última activación: {{ a.last_triggered_at | date:'dd/MM/yyyy HH:mm' }}</p>
                  }
                </div>
                <div class="alert-item__actions">
                  <button class="btn btn--outline btn--sm" (click)="editAlert(a)">Editar</button>
                  <button class="btn btn--sm" [class.btn--outline]="a.is_active" [class.btn--primary]="!a.is_active"
                    (click)="toggleAlert(a)">
                    {{ a.is_active ? 'Pausar' : 'Activar' }}
                  </button>
                  <button class="btn-icon btn-icon--danger" (click)="deleteAlert(a.id)" title="Eliminar">✕</button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 700; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 1rem;
    }
    .modal-card {
      width: 100%; max-width: 440px;
      h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.25rem; }
    }
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }
    .selected-product { font-size: .8rem; color: var(--color-primary); margin-top: .25rem; }
    .dropdown {
      list-style: none; margin: 0; padding: 0;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius); max-height: 200px; overflow-y: auto;
      li { padding: .5rem .75rem; cursor: pointer; font-size: .875rem; &:hover { background: var(--color-primary-light); } }
    }

    /* Alert list */
    .alert-list { display: flex; flex-direction: column; gap: .75rem; }
    .alert-item {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 1rem 1.25rem;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
      &--inactive { opacity: .55; }
      &--skeleton { height: 80px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    }
    .alert-item__info { flex: 1; }
    .alert-item__name { font-size: .95rem; font-weight: 600; margin-bottom: .2rem; }
    .alert-item__condition { font-size: .825rem; color: var(--color-text-muted); margin-bottom: .2rem; }
    .alert-item__last { font-size: .75rem; color: var(--color-text-muted); }
    .alert-item__actions { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
    .btn--sm { padding: .3rem .7rem; font-size: .8rem; }
    .btn-icon {
      background: none; border: none; cursor: pointer; font-size: .9rem; padding: .3rem .5rem;
      border-radius: var(--radius); color: var(--color-text-muted);
      &--danger:hover { color: var(--color-danger); background: #ffebee; }
    }

    .empty-state {
      text-align: center; padding: 3rem; color: var(--color-text-muted);
      background: var(--color-surface); border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      p { margin-bottom: .5rem; }
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class AlertsComponent implements OnInit {
  alerts = signal<Alert[]>([])
  loading = signal(true)
  showForm = signal(false)
  editing = signal<Alert | null>(null)
  saving = signal(false)
  formError = signal('')
  productResults = signal<{ id: string; name: string; brand: string }[]>([])
  skeletons = Array(3).fill(0)

  form = {
    product_id: '',
    product_label: '',
    product_search: '',
    threshold_type: 'percentage' as 'percentage' | 'fixed_price',
    threshold_value: 20,
    notification_channel: 'email' as 'email' | 'telegram' | 'both',
  }

  private searchTimeout: any

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load()
  }

  private load() {
    this.loading.set(true)
    this.api.getAlerts().subscribe({
      next: (res) => { this.alerts.set(res.data); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
  }

  openCreate() {
    this.editing.set(null)
    this.resetForm()
    this.showForm.set(true)
  }

  editAlert(a: any) {
    this.editing.set(a)
    this.form.product_id = a.product_id
    const brand = a.products?.brands?.name ?? ''
    const name = a.products?.name ?? a.product_id
    this.form.product_label = brand ? `${brand} — ${name}` : name
    this.form.product_search = this.form.product_label
    this.form.threshold_type = a.threshold_type as any
    this.form.threshold_value = a.threshold_value
    this.form.notification_channel = a.notification_channel as any
    this.showForm.set(true)
  }

  closeForm() {
    this.showForm.set(false)
    this.productResults.set([])
    this.formError.set('')
  }

  searchProduct(q: string) {
    clearTimeout(this.searchTimeout)
    this.form.product_id = ''
    this.form.product_label = ''
    if (!q.trim()) { this.productResults.set([]); return }
    this.searchTimeout = setTimeout(() => {
      this.api.getProducts({ q, limit: 8 }).subscribe({
        next: (res) => this.productResults.set(res.data.map(p => ({ id: p.id, name: p.name, brand: p.brand }))),
      })
    }, 300)
  }

  selectProduct(p: { id: string; name: string; brand: string }) {
    this.form.product_id = p.id
    this.form.product_label = `${p.brand} — ${p.name}`
    this.form.product_search = `${p.brand} — ${p.name}`
    this.productResults.set([])
  }

  saveAlert() {
    if (!this.form.product_id) return
    this.saving.set(true)
    this.formError.set('')

    const dto: CreateAlertDto = {
      product_id: this.form.product_id,
      threshold_type: this.form.threshold_type,
      threshold_value: Number(this.form.threshold_value),
      notification_channel: this.form.notification_channel,
    }

    const op = this.editing()
      ? this.api.updateAlert(this.editing()!.id, dto)
      : this.api.createAlert(dto)

    op.subscribe({
      next: () => { this.closeForm(); this.load() },
      error: (err) => {
        this.formError.set(err.error?.error ?? 'Error al guardar la alerta.')
        this.saving.set(false)
      },
    })
  }

  toggleAlert(a: Alert) {
    this.api.toggleAlert(a.id).subscribe({ next: () => this.load() })
  }

  deleteAlert(id: string) {
    if (!confirm('¿Eliminar esta alerta?')) return
    this.api.deleteAlert(id).subscribe({ next: () => this.load() })
  }

  channelLabel(ch: string): string {
    return { email: 'Email', telegram: 'Telegram', both: 'Email + Telegram' }[ch] ?? ch
  }

  private resetForm() {
    this.form = {
      product_id: '', product_label: '', product_search: '',
      threshold_type: 'percentage', threshold_value: 20, notification_channel: 'email',
    }
  }
}
