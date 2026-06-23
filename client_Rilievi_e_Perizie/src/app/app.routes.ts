import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { UsersManagement } from './users-management/users-management';
import { MapComponent } from './map.component/map.component';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: "", redirectTo: "dashboard", pathMatch: "full" },

  { path: "login", component: Login },
  { path: "dashboard", component: Dashboard, canActivate: [adminGuard],
    children: [
      {path: "", component: MapComponent},
      {path: "utenti", component: UsersManagement}
    ]
   },

  { path: "**", redirectTo: "login" }
];
