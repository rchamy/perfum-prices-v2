import { Routes } from '@angular/router'
import { authGuard } from './core/guards/auth.guard'
import { adminGuard } from './core/guards/admin.guard'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/callback.component').then((m) => m.CallbackComponent),
  },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: () => import('./features/favorites/favorites.component').then((m) => m.FavoritesComponent),
  },
  {
    path: 'alerts',
    canActivate: [authGuard],
    loadComponent: () => import('./features/alerts/alerts.component').then((m) => m.AlertsComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: 'stores',
        loadComponent: () => import('./features/admin/stores/stores.component').then((m) => m.StoresComponent),
      },
      {
        path: 'health',
        loadComponent: () => import('./features/admin/health/health.component').then((m) => m.HealthComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/users.component').then((m) => m.UsersComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
]
