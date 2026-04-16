import { Component, OnInit, signal } from '@angular/core'
import { RouterLink, RouterLinkActive, Router } from '@angular/router'
import { CommonModule } from '@angular/common'
import { SupabaseService } from '../../../core/services/supabase.service'
import { ApiService } from '../../../core/services/api.service'

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container navbar__inner">
        <a routerLink="/" class="navbar__brand">
          <span class="navbar__logo">🌸</span>
          <span>PerfumPrices</span>
        </a>

        <div class="navbar__links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Inicio</a>
          <a routerLink="/search" routerLinkActive="active">Buscar</a>
          @if (isLoggedIn()) {
            <a routerLink="/favorites" routerLinkActive="active">Favoritos</a>
            <a routerLink="/alerts" routerLinkActive="active">Alertas</a>
          }
          @if (isAdmin()) {
            <a routerLink="/admin/stores" routerLinkActive="active" class="navbar__admin">Admin</a>
          }
        </div>

        <div class="navbar__actions">
          @if (isLoggedIn()) {
            <a routerLink="/profile" class="navbar__avatar" [title]="userName()">
              {{ userInitial() }}
            </a>
            <button class="btn btn--outline" (click)="signOut()">Salir</button>
          } @else {
            <a routerLink="/auth/login" class="btn btn--outline">Ingresar</a>
            <a routerLink="/auth/register" class="btn btn--primary">Registrarse</a>
          }
        </div>

        <button class="navbar__hamburger" (click)="menuOpen.set(!menuOpen())">
          <span></span><span></span><span></span>
        </button>
      </div>

      @if (menuOpen()) {
        <div class="navbar__mobile container">
          <a routerLink="/" (click)="menuOpen.set(false)">Inicio</a>
          <a routerLink="/search" (click)="menuOpen.set(false)">Buscar</a>
          @if (isLoggedIn()) {
            <a routerLink="/favorites" (click)="menuOpen.set(false)">Favoritos</a>
            <a routerLink="/alerts" (click)="menuOpen.set(false)">Alertas</a>
            <a routerLink="/profile" (click)="menuOpen.set(false)">Perfil</a>
          }
          @if (isAdmin()) {
            <a routerLink="/admin/stores" (click)="menuOpen.set(false)">Admin</a>
          }
          @if (!isLoggedIn()) {
            <a routerLink="/auth/login" (click)="menuOpen.set(false)">Ingresar</a>
            <a routerLink="/auth/register" (click)="menuOpen.set(false)">Registrarse</a>
          }
        </div>
      }
    </nav>
  `,
  styles: [`
    .navbar {
      background: #fff;
      border-bottom: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .navbar__inner {
      display: flex;
      align-items: center;
      height: 60px;
      gap: 1.5rem;
    }
    .navbar__brand {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-primary);
      text-decoration: none;
      white-space: nowrap;
    }
    .navbar__logo { font-size: 1.4rem; }
    .navbar__links {
      display: flex;
      gap: 1.25rem;
      flex: 1;
      a {
        color: var(--color-text-muted);
        font-size: .9rem;
        font-weight: 500;
        text-decoration: none;
        padding: .25rem 0;
        border-bottom: 2px solid transparent;
        transition: color .15s, border-color .15s;
        &:hover, &.active { color: var(--color-primary); border-color: var(--color-primary); }
      }
    }
    .navbar__admin { color: var(--color-accent) !important; }
    .navbar__actions {
      display: flex;
      align-items: center;
      gap: .75rem;
    }
    .navbar__avatar {
      width: 34px;
      height: 34px;
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: .875rem;
      text-decoration: none;
    }
    .navbar__hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: .25rem;
      span { display: block; width: 24px; height: 2px; background: var(--color-text); border-radius: 2px; }
    }
    .navbar__mobile {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      gap: .75rem;
      border-top: 1px solid var(--color-border);
      a { color: var(--color-text); font-size: .95rem; text-decoration: none; padding: .25rem 0; }
    }
    @media (max-width: 768px) {
      .navbar__links, .navbar__actions { display: none; }
      .navbar__hamburger { display: flex; margin-left: auto; }
    }
  `]
})
export class NavbarComponent implements OnInit {
  menuOpen = signal(false)
  isLoggedIn = signal(false)
  isAdmin = signal(false)
  userName = signal('')
  userInitial = signal('U')

  constructor(
    private supabase: SupabaseService,
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.supabase.user$.subscribe(async (user) => {
      this.isLoggedIn.set(!!user)
      if (user) {
        this.api.getMe().subscribe(({ data }) => {
          this.userName.set(data?.name ?? user.email ?? '')
          this.userInitial.set((data?.name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase())
          this.isAdmin.set(data?.role === 'admin')
        })
      } else {
        this.isAdmin.set(false)
        this.userName.set('')
      }
    })
  }

  async signOut() {
    await this.supabase.signOut()
    this.router.navigate(['/'])
  }
}
