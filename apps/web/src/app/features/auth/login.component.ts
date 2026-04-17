import { Component, signal } from '@angular/core'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common'
import { SupabaseService } from '../../core/services/supabase.service'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <span class="auth-logo">🌸</span>
          <h1>Iniciar sesión</h1>
          <p>¿No tienes cuenta? <a routerLink="/auth/register">Regístrate gratis</a></p>
        </div>

        @if (error()) {
          <div class="alert alert--error">{{ error() }}</div>
        }
        @if (resetSent()) {
          <div class="alert alert--success">Te enviamos un email para restablecer tu contraseña. Revisa tu bandeja.</div>
        }

        <button class="btn btn--outline btn--full btn--lg google-btn" (click)="loginWithGoogle()" [disabled]="loading()">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="Google" />
          Continuar con Google
        </button>

        <div class="divider">o ingresa con email</div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" placeholder="tu@email.com" autocomplete="email" />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="error-msg">Ingresa un email válido</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="input-eye">
              <input id="password" [type]="showPassword() ? 'text' : 'password'"
                formControlName="password" placeholder="••••••••" autocomplete="current-password" />
              <button type="button" class="eye-btn" (click)="showPassword.set(!showPassword())">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
            </div>
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="error-msg">Ingresa tu contraseña</span>
            }
          </div>

          <button type="submit" class="btn btn--primary btn--full btn--lg" [disabled]="loading() || form.invalid">
            @if (loading()) { <span class="spinner"></span> } @else { Ingresar }
          </button>

          <button type="button" class="btn-forgot" (click)="sendReset()" [disabled]="loading()">
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 60%);
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 1.75rem;
      .auth-logo { font-size: 2.5rem; display: block; margin-bottom: .5rem; }
      h1 { font-size: 1.5rem; font-weight: 700; }
      p { font-size: .875rem; color: var(--color-text-muted); margin-top: .25rem; }
    }
    .google-btn {
      display: flex;
      align-items: center;
      gap: .75rem;
      font-weight: 500;
    }
    .input-eye {
      position: relative;
      input { padding-right: 2.5rem; }
    }
    .eye-btn {
      position: absolute;
      right: .75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }
    .btn-forgot {
      display: block;
      margin-top: .75rem;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      font-size: .85rem;
      color: var(--color-primary);
      text-align: center;
      &:hover { text-decoration: underline; }
      &:disabled { opacity: .5; cursor: default; }
    }
  `]
})
export class LoginComponent {
  form: FormGroup
  loading = signal(false)
  error = signal('')
  resetSent = signal(false)
  showPassword = signal(false)

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    })
  }

  async onSubmit() {
    if (this.form.invalid) return
    this.loading.set(true)
    this.error.set('')

    const { email, password } = this.form.value
    const { error } = await this.supabase.signInWithEmail(email, password)

    if (error) {
      this.error.set(this.translateError(error.message))
      this.loading.set(false)
    } else {
      this.router.navigate(['/'])
    }
  }

  async loginWithGoogle() {
    this.loading.set(true)
    await this.supabase.signInWithGoogle()
    // redirect handled by Supabase
  }

  async sendReset() {
    const email = this.form.get('email')?.value?.trim()
    if (!email) {
      this.error.set('Ingresa tu email en el campo de arriba para recuperar tu contraseña.')
      return
    }
    this.loading.set(true)
    this.error.set('')
    this.resetSent.set(false)
    const { error } = await this.supabase.resetPassword(email)
    this.loading.set(false)
    if (error) {
      this.error.set('No se pudo enviar el email. Verifica que el email sea correcto.')
    } else {
      this.resetSent.set(true)
    }
  }

  private translateError(msg: string): string {
    if (msg.includes('Invalid login')) return 'Email o contraseña incorrectos'
    if (msg.includes('Email not confirmed')) return 'Debes confirmar tu email antes de ingresar'
    return 'Error al iniciar sesión. Intenta nuevamente.'
  }
}
