import { Component, inject } from '@angular/core';
import { PerizieService } from '../services/perizie-service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

@Component({
  selector: 'app-aside',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './aside.html',
  styleUrl: './aside.css',
})
export class Aside {
  private perizieService:PerizieService = inject(PerizieService)
  private router:Router = inject(Router)
  private adminAuth:AdminAuthService = inject(AdminAuthService)
  
  doLogout(){
    this.perizieService.logout()?.subscribe({
      "next": (data:any) => {
        console.log(data)
        this.adminAuth.clear()
        this.router.navigate(["/login"])
      },
      "error": (error: any) => {
        console.log(error)
        this.adminAuth.clear()
        this.router.navigate(["/login"])
      }
    })
  }

}
