import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../../core/services/api.service'
import { SupabaseService } from '../../../core/services/supabase.service'

interface AdminUser {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'visitor'
  created_at: string
  telegram_id: number | null
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Usuarios</h1>
          <div class="search-wrap">
            <input type="search" class="search-input" placeholder="Buscar por nombre o email…"
              [(ngModel)]="searchQ" (ngModelChange)="load()" />
          </div>
        </div>

        @if (successMsg()) {
          <div class="alert alert--success">{{ successMsg() }}</div>
        }
        @if (errorMsg()) {
          <div class="alert alert--error">{{ errorMsg() }}</div>
        }

        @if (loading()) {
          <div class="sk-table"></div>
        } @else if (users().length === 0) {
          <div class="empty-state"><p>No se encontraron usuarios.</p></div>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Registro</th>
                  <th>Telegram</th>
                  <th>Rol</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td class="td-user">
                      <div class="user-avatar">{{ (u.name || u.email)[0].toUpperCase() }}</div>
                      <div>
                        <strong>{{ u.name || '—' }}</strong>
                        <p class="user-email">{{ u.email }}</p>
                      </div>
                    </td>
                    <td>{{ u.created_at | date:'dd/MM/yyyy' }}</td>
                    <td>
                      @if (u.telegram_id) {
                        <span class="badge badge--success">✓ Vinculado</span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <span class="badge" [class.badge--admin]="u.role === 'admin'" [class.badge--visitor]="u.role === 'visitor'">
                        {{ u.role }}
                      </span>
                    </td>
                    <td>
                      @if (u.id !== currentUserId()) {
                        <button class="btn btn--outline btn--sm"
                          (click)="toggleRole(u)"
                          [disabled]="changingId() === u.id">
                          @if (changingId() === u.id) { <span class="spinner spinner--dark"></span> }
                          @else { {{ u.role === 'admin' ? 'Hacer visitante' : 'Hacer admin' }} }
                        </button>
                      } @else {
                        <span class="text-muted text-sm">(tú)</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (total() > pageSize) {
            <div class="pagination">
              <button class="btn btn--outline btn--sm" [disabled]="page() <= 1" (click)="goTo(page() - 1)">← Anterior</button>
              <span class="text-muted text-sm">Pág. {{ page() }} / {{ totalPages() }}</span>
              <button class="btn btn--outline btn--sm" [disabled]="page() >= totalPages()" (click)="goTo(page() + 1)">Siguiente →</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
    .page-title { font-size: 1.5rem; font-weight: 700; }
    .search-wrap { flex: 0 0 260px; }
    .search-input {
      width: 100%; padding: .5rem .75rem;
      border: 1px solid var(--color-border); border-radius: var(--radius);
      font-size: .875rem;
      &:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
    }

    .table-wrap { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--color-border); }
    .data-table {
      width: 100%; border-collapse: collapse;
      th, td { padding: .75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); font-size: .875rem; }
      th { background: var(--color-surface); font-weight: 600; color: var(--color-text-muted); font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: var(--color-primary-light); }
    }
    .td-user { display: flex; align-items: center; gap: .75rem; }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--color-primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: .9rem; flex-shrink: 0;
    }
    .user-email { font-size: .75rem; color: var(--color-text-muted); }

    .badge--admin { background: #fff3e0; color: #e65100; }
    .badge--visitor { background: #f5f5f5; color: #616161; }
    .badge--success { background: #e8f5e9; color: #2e7d32; }
    .text-muted { color: var(--color-text-muted); }
    .text-sm { font-size: .8rem; }
    .btn--sm { padding: .3rem .7rem; font-size: .8rem; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem; }

    .sk-table { height: 200px; border-radius: var(--radius-lg); background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .empty-state { text-align: center; padding: 3rem; color: var(--color-text-muted); background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class UsersComponent implements OnInit {
  users = signal<AdminUser[]>([])
  loading = signal(true)
  changingId = signal<string | null>(null)
  currentUserId = signal<string | null>(null)
  successMsg = signal('')
  errorMsg = signal('')
  total = signal(0)
  page = signal(1)
  searchQ = ''
  readonly pageSize = 20
  private searchTimeout: any

  totalPages = () => Math.max(1, Math.ceil(this.total() / this.pageSize))

  constructor(
    private api: ApiService,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit() {
    const { data } = await this.supabase.getSession()
    this.currentUserId.set(data.session?.user?.id ?? null)
    this.load()
  }

  load() {
    clearTimeout(this.searchTimeout)
    this.searchTimeout = setTimeout(() => this.fetchUsers(), 300)
  }

  private fetchUsers() {
    this.loading.set(true)
    const params: Record<string, string | number> = {
      limit: this.pageSize,
      offset: (this.page() - 1) * this.pageSize,
    }
    if (this.searchQ) params['q'] = this.searchQ
    this.api.getAdminUsers(params).subscribe({
      next: (res: any) => {
        this.users.set(res.data ?? [])
        this.total.set(res.total ?? res.data?.length ?? 0)
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  goTo(p: number) {
    this.page.set(p)
    this.fetchUsers()
  }

  toggleRole(u: AdminUser) {
    const newRole = u.role === 'admin' ? 'visitor' : 'admin'
    this.changingId.set(u.id)
    this.successMsg.set('')
    this.errorMsg.set('')
    this.api.changeUserRole(u.id, newRole).subscribe({
      next: () => {
        this.changingId.set(null)
        this.successMsg.set(`Rol de ${u.name || u.email} actualizado a "${newRole}".`)
        this.fetchUsers()
      },
      error: (err) => {
        this.changingId.set(null)
        this.errorMsg.set(err.error?.error ?? 'No se pudo cambiar el rol.')
      },
    })
  }
}
