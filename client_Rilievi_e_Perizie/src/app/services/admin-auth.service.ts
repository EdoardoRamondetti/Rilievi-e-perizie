import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private readonly adminKey = 'is_admin_authenticated';

  setAdminAuthenticated(value: boolean): void {
    sessionStorage.setItem(this.adminKey, value ? '1' : '0');
  }

  isAdminAuthenticated(): boolean {
    return sessionStorage.getItem(this.adminKey) === '1';
  }

  clear(): void {
    sessionStorage.removeItem(this.adminKey);
  }
}
