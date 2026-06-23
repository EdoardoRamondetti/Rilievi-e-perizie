import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Aside } from '../aside/aside';

@Component({
  selector: 'app-dashboard',
  imports: [Aside, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
}
