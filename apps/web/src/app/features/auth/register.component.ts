import { Component, signal } from '@angular/core'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common'
import { SupabaseService } from '../../core/services/supabase.service'

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <span class="auth-logo">🌸</span>
          <h1>Crear cuenta</h1>
          <p>¿Ya tienes cuenta? <a routerLink="/auth/login">Ingresa aquí</a></p>
        </div>

        @if (error()) {
          <div class="alert alert--error">{{ error() }}</div>
        }
        @if (success()) {
          <div class="alert alert--success">
            ✅ Cuenta creada. Revisa tu email para confirmar tu cuenta.
          </div>
        }

        @if (!success()) {
          <button class="btn btn--outline btn--full btn--lg google-btn" (click)="registerWithGoogle()" [disabled]="loading()">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="Google" />
            Continuar con Google
          </button>

          <div class="divider">o regístrate con email</div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="name">Nombre</label>
              <input id="name" type="text" formControlName="name" placeholder="Tu nombre" autocomplete="name" />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <span class="error-msg">Ingresa tu nombre</span>
              }
            </div>

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
                  formControlName="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
                <button type="button" class="eye-btn" (click)="showPassword.set(!showPassword())">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
              @if (form.get('password')?.errors?.['minlength'] && form.get('password')?.touched) {
                <span class="error-msg">La contraseña debe tener al menos 8 caracteres</span>
              }
            </div>

            <button type="submit" class="btn btn--primary btn--full btn--lg" [disabled]="loading() || form.invalid">
              @if (loading()) { <span class="spinner"></span> } @else { Crear cuenta }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 60px);
      display: flex; align-items: center; justify-content: center;
      padding: 2rem 1rem;
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 60%);
    }
    .auth-card { width: 100%; max-width: 420px; }
    .auth-header {
      text-align: center; margin-bottom: 1.75rem;
      .auth-logo { font-size: 2.5rem; display: block; margin-bottom: .5rem; }
      h1 { font-size: 1.5rem; font-weight: 700; }
      p { font-size: .875rem; color: var(--color-text-muted); margin-top: .25rem; }
    }
    .google-btn { display: flex; align-items: center; gap: .75rem; font-weight: 500; }
    .input-eye { position: relative; input { padding-right: 2.5rem; } }
    .eye-btn {
      position: absolute; right: .75rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; font-size: 1rem; line-height: 1;
    }
  `]
})
export class RegisterComponent {
  form: FormGroup
  loading = signal(false)
  error = signal('')
  success = signal(false)
  showPassword = signal(false)

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    })
  }

  async onSubmit() {
    if (this.form.invalid) return
    this.loading.set(true)
    this.error.set('')

    const { name, email, password } = this.form.value
    const { error } = await this.supabase.signUpWithEmail(email, password, name)

    this.loading.set(false)
    if (error) {
      this.error.set(this.translateError(error.message))
    } else {
      this.success.set(true)
    }
  }

  async registerWithGoogle() {
    this.loading.set(true)
    await this.supabase.signInWithGoogle()
  }

  private translateError(msg: string): string {
    if (msg.includes('already registered')) return 'Este email ya tiene una cuenta. ¿Quieres ingresar?'
    if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 8 caracteres'
    return 'Error al crear la cuenta. Intenta nuevamente.'
  }
}
