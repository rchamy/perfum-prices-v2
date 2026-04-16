import { inject } from '@angular/core'
import { type CanActivateFn, Router } from '@angular/router'
import { map, switchMap } from 'rxjs'
import { ApiService } from '../services/api.service'
import { SupabaseService } from '../services/supabase.service'

export const adminGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService)
  const api = inject(ApiService)
  const router = inject(Router)

  return supabase.user$.pipe(
    switchMap(() => api.getMe()),
    map(({ data }) =>
      data?.role === 'admin' ? true : router.createUrlTree(['/']),
    ),
  )
}
