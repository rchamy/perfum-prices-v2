import { inject } from '@angular/core'
import { type CanActivateFn, Router } from '@angular/router'
import { map } from 'rxjs'
import { SupabaseService } from '../services/supabase.service'

export const authGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService)
  const router = inject(Router)

  return supabase.user$.pipe(
    map((user) => (user ? true : router.createUrlTree(['/auth/login']))),
  )
}
