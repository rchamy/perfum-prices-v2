import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { SupabaseService } from '../../core/services/supabase.service'

@Component({
  selector: 'app-callback',
  standalone: true,
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 60px);flex-direction:column;gap:1rem;">
      <span class="spinner spinner--dark"></span>
      <p style="color:var(--color-text-muted);font-size:.9rem;">Completando inicio de sesión…</p>
    </div>
  `,
})
export class CallbackComponent implements OnInit {
  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    // Supabase handles the OAuth token from the URL hash automatically.
    // Wait briefly for the session to be established, then redirect.
    const { data } = await this.supabase.getSession()
    this.router.navigate([data.session ? '/' : '/auth/login'])
  }
}
