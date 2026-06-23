import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from "@ionic/angular/standalone";
import { PerizieService } from '../services/perizie-service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [IonContent]
})
export class DashboardComponent {
  private router = inject(Router);
  public perizieService:PerizieService = inject(PerizieService)

  ngOnInit(){
    this.perizieService.checkToken()?.subscribe({
    next:(data) => {
      console.log(data)
    },
    error: (err) => {
      console.log(err)
      if (err.status === 403) {
        this.router.navigate(['/login']);
      }
    }
  });
  }

  startNewPerizia() {
    this.router.navigate(['/nuovaPerizia']);
  }
}
