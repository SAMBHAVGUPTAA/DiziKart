import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { tap, Observable } from 'rxjs';
import { AuthService } from 'src/app/services/auth/auth.service';

export const AuthGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const url = state.url;

  return authService.isAuthenticated(url).pipe(
    tap((isAuthenticated) => {
      if (!isAuthenticated) {
        router.navigate(['/login']);
      }
    })
  );
};