import { Injectable } from '@angular/core'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { BehaviorSubject } from 'rxjs'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  )

  private _user$ = new BehaviorSubject<User | null>(null)
  readonly user$ = this._user$.asObservable()

  constructor() {
    this.client.auth.getUser().then(({ data }) => this._user$.next(data.user))
    this.client.auth.onAuthStateChange((_event, session) => {
      this._user$.next(session?.user ?? null)
    })
  }

  async signInWithEmail(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password })
  }

  async signUpWithEmail(email: string, password: string, name: string) {
    return this.client.auth.signUp({ email, password, options: { data: { full_name: name } } })
  }

  async signInWithGoogle() {
    return this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async signOut() {
    return this.client.auth.signOut()
  }

  async getSession() {
    return this.client.auth.getSession()
  }

  async resetPassword(email: string) {
    return this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
  }
}
