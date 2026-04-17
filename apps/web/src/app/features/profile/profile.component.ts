import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../core/services/api.service'
import { SupabaseService } from '../../core/services/supabase.service'

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="container profile-container">
        <h1 class="page-title">Mi perfil</h1>

        @if (loading()) {
          <div class="sk-form">
            <div class="sk-line sk-line--lg"></div>
            <div class="sk-line sk-line--md"></div>
            <div class="sk-line sk-line--sm"></div>
          </div>
        } @else {
          <!-- Datos personales -->
          <section class="profile-section card">
            <h2>Datos personales</h2>

            @if (saveSuccess()) {
              <div class="alert alert--success">Cambios guardados correctamente.</div>
            }
            @if (saveError()) {
              <div class="alert alert--error">{{ saveError() }}</div>
            }

            <div class="form-group">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="form.name" placeholder="Tu nombre" />
            </div>

            <div class="form-group">
              <label>Canal de notificación preferido</label>
              <select [(ngModel)]="form.notification_channel">
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="both">Ambos</option>
              </select>
            </div>

            <button class="btn btn--primary" (click)="saveProfile()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> } @else { Guardar cambios }
            </button>
          </section>

          <!-- Vincular Telegram -->
          <section class="profile-section card">
            <h2>Vincular Telegram</h2>
            <p class="section-desc">
              Recibe alertas de precios directamente en Telegram. Para vincular tu cuenta,
              genera un token y úsalo en nuestro bot de Telegram.
            </p>

            @if (telegramLinked()) {
              <div class="telegram-status telegram-status--ok">
                ✓ Cuenta de Telegram vinculada
                <span class="telegram-id">(ID: {{ telegramId() }})</span>
              </div>
            } @else {
              @if (telegramToken()) {
                <div class="token-box">
                  <p class="token-label">Envía este comando al bot <strong>@PerfumPricesBot</strong>:</p>
                  <code class="token-code">/start {{ telegramToken() }}</code>
                  <p class="token-expiry">Este token expira en 10 minutos.</p>
                </div>
              }

              <button class="btn btn--outline" (click)="requestToken()" [disabled]="loadingToken()">
                @if (loadingToken()) { <span class="spinner spinner--dark"></span> }
                @else { Generar token de vinculación }
              </button>
            }
          </section>

          <!-- Cuenta -->
          <section class="profile-section card">
            <h2>Cuenta</h2>
            <p class="section-desc">Email: <strong>{{ email() }}</strong></p>
            <p class="section-desc">Rol: <span class="badge" [class.badge--admin]="role() === 'admin'">{{ role() }}</span></p>
            <button class="btn btn--outline btn--danger" (click)="signOut()">Cerrar sesión</button>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-container { max-width: 600px; }
    .page-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; }
    .profile-section {
      margin-bottom: 1.5rem;
      h2 { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; }
    }
    .section-desc { font-size: .9rem; color: var(--color-text-muted); margin-bottom: 1rem; }

    .telegram-status {
      padding: .6rem 1rem; border-radius: var(--radius);
      font-size: .875rem; font-weight: 500;
      &--ok { background: #e8f5e9; color: #2e7d32; }
    }
    .telegram-id { font-weight: 400; margin-left: .5rem; opacity: .7; }

    .token-box {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem;
    }
    .token-label { font-size: .85rem; color: var(--color-text-muted); margin-bottom: .5rem; }
    .token-code {
      display: block; padding: .5rem .75rem;
      background: #1e1e2e; color: #cdd6f4;
      border-radius: var(--radius); font-size: .9rem;
      user-select: all; margin-bottom: .5rem;
    }
    .token-expiry { font-size: .75rem; color: var(--color-text-muted); }

    .badge--admin { background: #fff3e0; color: #e65100; }
    .btn--danger { color: var(--color-danger); border-color: var(--color-danger); &:hover { background: #ffebee; } }

    /* Skeleton */
    .sk-form { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; background: var(--color-surface); border-radius: var(--radius-lg); }
    .sk-line {
      height: 1rem; border-radius: 4px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
      &--sm { width: 30%; }
      &--md { width: 55%; }
      &--lg { width: 80%; height: 1.5rem; }
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class ProfileComponent implements OnInit {
  loading = signal(true)
  saving = signal(false)
  saveSuccess = signal(false)
  saveError = signal('')
  loadingToken = signal(false)
  telegramToken = signal('')
  telegramLinked = signal(false)
  telegramId = signal<number | null>(null)
  email = signal('')
  role = signal('visitor')

  form = { name: '', notification_channel: 'email' }

  constructor(
    private api: ApiService,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit() {
    const { data } = await this.supabase.getSession()
    this.email.set(data.session?.user?.email ?? '')

    this.api.getMe().subscribe({
      next: (res) => {
        const u = res.data
        this.form.name = u.name ?? ''
        this.form.notification_channel = u.notification_channel ?? 'email'
        this.role.set(u.role ?? 'visitor')
        this.telegramLinked.set(!!u.telegram_id)
        this.telegramId.set(u.telegram_id ?? null)
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  saveProfile() {
    this.saving.set(true)
    this.saveSuccess.set(false)
    this.saveError.set('')
    this.api.updateMe({ name: this.form.name, notification_channel: this.form.notification_channel as any }).subscribe({
      next: () => { this.saveSuccess.set(true); this.saving.set(false) },
      error: () => { this.saveError.set('No se pudo guardar.'); this.saving.set(false) },
    })
  }

  requestToken() {
    this.loadingToken.set(true)
    this.api.requestTelegramLink().subscribe({
      next: (res) => { this.telegramToken.set(res.token); this.loadingToken.set(false) },
      error: () => this.loadingToken.set(false),
    })
  }

  async signOut() {
    await this.supabase.signOut()
    window.location.href = '/'
  }
}
