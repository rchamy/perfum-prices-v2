import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ApiService } from '../../../core/services/api.service'
import type { WorkerHealthSummary } from '@perfum/shared'

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Estado del Worker</h1>
          <button class="btn btn--outline" (click)="load()" [disabled]="loading()">
            ↻ Actualizar
          </button>
        </div>

        @if (runSuccess()) {
          <div class="alert alert--success">Ejecución manual solicitada. El worker procesará la tienda en los próximos segundos.</div>
        }

        @if (loading()) {
          <div class="health-grid">
            @for (s of skeletons; track s) {
              <div class="health-card health-card--skeleton"></div>
            }
          </div>
        } @else if (summaries().length === 0) {
          <div class="empty-state"><p>No hay datos del worker aún.</p></div>
        } @else {
          <div class="health-grid">
            @for (s of summaries(); track s.store_id) {
              <div class="health-card health-card--{{ s.status }}">
                <div class="health-card__header">
                  <div class="status-dot status-dot--{{ s.status }}"></div>
                  <h3 class="health-card__name">{{ s.store_name }}</h3>
                  <span class="badge badge--{{ s.status }}">{{ statusLabel(s.status) }}</span>
                </div>

                <dl class="health-meta">
                  <div class="health-meta__row">
                    <dt>Último éxito</dt>
                    <dd>{{ s.last_success_at ? (s.last_success_at | date:'dd/MM HH:mm') : '—' }}</dd>
                  </div>
                  @if (s.last_error_at) {
                    <div class="health-meta__row">
                      <dt>Último error</dt>
                      <dd class="text-danger">{{ s.last_error_at | date:'dd/MM HH:mm' }}</dd>
                    </div>
                  }
                  @if (s.last_error_message) {
                    <div class="health-meta__row health-meta__row--full">
                      <dt>Mensaje</dt>
                      <dd class="text-danger error-msg">{{ s.last_error_message }}</dd>
                    </div>
                  }
                  <div class="health-meta__row">
                    <dt>Productos encontrados</dt>
                    <dd>{{ s.last_products_found }}</dd>
                  </div>
                </dl>

                <!-- Mini historial -->
                @if (s.recent_logs?.length) {
                  <div class="recent-logs">
                    @for (log of s.recent_logs.slice(0, 5); track log.started_at) {
                      <span class="log-dot log-dot--{{ log.status }}" [title]="log.started_at + ' · ' + log.products_found + ' productos'"></span>
                    }
                  </div>
                }

                <button class="btn btn--outline btn--sm btn--full" (click)="runNow(s)" [disabled]="runningIds.has(s.store_id)">
                  @if (runningIds.has(s.store_id)) { <span class="spinner spinner--dark"></span> }
                  @else { ▶ Ejecutar ahora }
                </button>
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

    .health-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }

    .health-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 1.25rem;
      display: flex; flex-direction: column; gap: .75rem;
      &--ok { border-left: 3px solid #4caf50; }
      &--warning { border-left: 3px solid #ff9800; }
      &--error { border-left: 3px solid var(--color-danger); }
      &--skeleton { height: 220px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    }

    .health-card__header { display: flex; align-items: center; gap: .5rem; }
    .health-card__name { font-size: .95rem; font-weight: 600; flex: 1; }

    .status-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
      &--ok { background: #4caf50; }
      &--warning { background: #ff9800; }
      &--error { background: var(--color-danger); }
    }

    .badge--ok { background: #e8f5e9; color: #2e7d32; }
    .badge--warning { background: #fff3e0; color: #e65100; }
    .badge--error { background: #ffebee; color: #c62828; }

    .health-meta {
      display: grid; grid-template-columns: 1fr 1fr; gap: .35rem .5rem;
      font-size: .8rem;
      dt { color: var(--color-text-muted); }
      dd { font-weight: 500; }
      &__row--full { grid-column: 1/-1; }
    }
    .text-danger { color: var(--color-danger); }
    .error-msg { font-size: .75rem; word-break: break-word; }

    .recent-logs { display: flex; gap: .3rem; }
    .log-dot {
      width: 12px; height: 12px; border-radius: 50%;
      &--success { background: #4caf50; }
      &--error { background: var(--color-danger); }
      &--running { background: #2196f3; }
    }

    .btn--sm { padding: .3rem .7rem; font-size: .8rem; }
    .btn--full { width: 100%; }

    .empty-state { text-align: center; padding: 3rem; color: var(--color-text-muted); background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class HealthComponent implements OnInit {
  summaries = signal<WorkerHealthSummary[]>([])
  loading = signal(true)
  runSuccess = signal(false)
  runningIds = new Set<string>()
  skeletons = Array(6).fill(0)

  constructor(private api: ApiService) {}

  ngOnInit() { this.load() }

  load() {
    this.loading.set(true)
    this.runSuccess.set(false)
    this.api.getWorkerHealth().subscribe({
      next: (res) => { this.summaries.set(res.data); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
  }

  runNow(s: WorkerHealthSummary) {
    this.runningIds.add(s.store_id)
    this.runSuccess.set(false)
    this.api.runWorkerNow(s.store_id).subscribe({
      next: () => { this.runningIds.delete(s.store_id); this.runSuccess.set(true) },
      error: () => this.runningIds.delete(s.store_id),
    })
  }

  statusLabel(status: string): string {
    return { ok: 'OK', warning: 'Advertencia', error: 'Error' }[status] ?? status
  }
}
