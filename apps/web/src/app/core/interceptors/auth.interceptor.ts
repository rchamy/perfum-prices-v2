import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { from, switchMap } from 'rxjs'
import { SupabaseService } from '../services/supabase.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabase = inject(SupabaseService)

  return from(supabase.getSession()).pipe(
    switchMap(({ data }) => {
      const token = data.session?.access_token
      if (token) {
        req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      }
      return next(req)
    }),
  )
}
