import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MapService } from '../services/map.service';
import { PerizieService } from '../services/perizie-service';
import { Router } from '@angular/router';
import { DetailsPerizia } from '../details-perizia/details-perizia';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [DetailsPerizia],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnDestroy {
  private perizieService:PerizieService = inject(PerizieService)
  private router:Router = inject(Router)
  constructor(private mapService: MapService) {}

  public operatori:any[] = []
  public perizie: any[] = [];
  public errorMessage:string = ""
  public showDetailsPanel:boolean = false
  public periziaSselezionata:any = null
  public selectedRouteInfo: { distanceKm: number; durationMin: number } | null = null;

  public style!: string;
  public sedeAddress = "68 Via San Michele, Fossano, Italia";
  public sedeTitle = "Sede centrale";
  public sedeSubtitle = "Ufficio principale";
  public sedeDescription = "Punto di riferimento principale per tutte le attività della filiale di Fossano.";
  public sedeHours = "Lun-Ven 09:00 - 18:00";
  public sedePhone = "+39 0172 123456";
  public zoom = 15.5;
  public icon = "/marker.png";

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private startPos: any = null;
  private mapPronta = false;

  ngOnInit() {
    this.style = this.mapService.openMapsStyle;
    this.caricaDati();
  }

  async ngAfterViewInit() {
    await this.loadMap();
    this.mapPronta = true;
    if (this.perizie.length > 0) {
      await this.refreshMap();
    }
  }

  #creaPopupHTMLDaValori(
  codice: string, descrizione: string, operatore: string,
  data: string, lat: string, lng: string,
  nFoto: number, primaFoto: string
): string {
  return `
    <!-- Header ambra con X custom -->
    <div style="
      background: #e8a020;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    ">
      <span style="font-size:10px;font-weight:700;color:#000;letter-spacing:.06em;">${codice}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:9px;color:rgba(0,0,0,.6);">${data}</span>
        <button id="popup-close" style="
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(0,0,0,0.6);
          font-size: 16px;
          font-weight: 900;
          line-height: 1;
          padding: 0;
          display: flex;
          align-items: center;
        ">×</button>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:10px;">

      <div style="font-size:11px;color:#e8e0c8;margin-bottom:8px;line-height:1.4;">
        ${descrizione}
      </div>

      <div style="margin-bottom:5px;">
        <span style="font-size:9px;color:#7a9070;text-transform:uppercase;letter-spacing:.06em;">Operatore</span>
        <div style="font-size:10px;color:#e8e0c8;margin-top:1px;">${operatore}</div>
      </div>

      <div style="margin-bottom:8px;">
        <span style="font-size:9px;color:#7a9070;text-transform:uppercase;letter-spacing:.06em;">GPS</span>
        <div style="font-size:9px;color:#e8a020;margin-top:1px;">${lat}° N / ${lng}° E</div>
      </div>

      ${primaFoto ? `
        <img src="${primaFoto}" style="
          width:100%;
          aspect-ratio:16/9;
          object-fit:cover;
          border-radius:3px;
          border:1px solid #2e4a2e;
          margin-bottom:6px;
        "/>
      ` : ''}

      <span style="
        display:inline-block;
        padding:1px 6px;
        background:rgba(232,160,32,.15);
        border:1px solid rgba(232,160,32,.3);
        border-radius:2px;
        font-size:9px;
        color:#e8a020;
        letter-spacing:.05em;
      ">${nFoto} FOTO</span>

    </div>
  `;
}

  async loadMap() {
    this.startPos = await this.mapService.geocode(this.sedeAddress);
    if (!this.startPos) return;

    await this.mapService.drawMap(
      this.style,
      this.mapContainer.nativeElement,
      this.startPos.center,
      this.zoom
    );

    if (!this.mapService.map) return;
    this.mapService.addPOILayer();
    this.aggiungiSede();  // ← metodo separato, richiamabile
  }

  #creaPopupSedeHTML(): string {
    return `
      <div style="background:#0f2616;padding:14px 16px 12px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          <span style="width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#22c55e,#10b981);color:#fff;font-weight:800;font-size:16px;box-shadow:0 8px 24px rgba(34,197,94,.18);">S</span>
          <div style="min-width:0;">
            <div style="font-size:1rem;font-weight:700;color:#f8fafc;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.sedeTitle}</div>
            <div style="font-size:0.82rem;color:rgba(248,250,252,.76);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.sedeSubtitle}</div>
          </div>
        </div>
        <button id="popup-close" style="background:rgba(255,255,255,.08);border:none;color:#f8fafc;font-size:18px;width:32px;height:32px;border-radius:12px;cursor:pointer;transition:background .2s;">×</button>
      </div>
      <div style="background:#111811;padding:14px 16px;">
        <p style="font-size:0.84rem;color:#d1fae5;margin-bottom:12px;line-height:1.5;">${this.sedeDescription}</p>
        <div style="display:grid;gap:10px;">
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:0.82rem;color:#d1fae5;">
            <span style="color:#a7f3d0;font-weight:700;">Indirizzo</span>
            <span style="text-align:right;">${this.sedeAddress}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:0.82rem;color:#d1fae5;">
            <span style="color:#a7f3d0;font-weight:700;">Orario</span>
            <span style="text-align:right;">${this.sedeHours}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:0.82rem;color:#d1fae5;">
            <span style="color:#a7f3d0;font-weight:700;">Telefono</span>
            <span style="text-align:right;">${this.sedePhone}</span>
          </div>
        </div>
      </div>
    `;
  }

  private aggiungiSede() {
    if (!this.startPos) return;

    this.mapService.addMarker(
      this.startPos.center,
      this.icon,
      "Sede dell'ufficio",
      this.#creaPopupSedeHTML()
    );
  }

  async refreshMap() {
  if (!this.startPos) return;

  this.mapService.clearMarkers?.();
  this.mapService.clearRoutes?.();
  this.selectedRouteInfo = null;
  this.aggiungiSede();

  // Prima tutti i marker — cattura ogni perizia con destructuring
  for (const perizia of this.perizie) {
    const center: [number, number] = [
      perizia.coordinate.lng,
      perizia.coordinate.lat
    ];

    const codice      = perizia.codice ?? 'PERIZIA';
    const descrizione = perizia.descrizione || 'Nessuna descrizione';
    const operatore   = perizia.operatore;
    const data        = new Date(perizia.dataOra).toLocaleDateString('it-IT');
    const lat         = perizia.coordinate.lat.toFixed(5);
    const lng         = perizia.coordinate.lng.toFixed(5);
    const nFoto       = perizia.foto?.length ?? 0;
    const primaFoto   = perizia.foto?.[0]?.url ?? '';

    const popupHTML = this.#creaPopupHTMLDaValori(
      codice, descrizione, operatore, data, lat, lng, nFoto, primaFoto
    );

    const marker = this.mapService.addMarker(center, this.icon, codice, popupHTML);
    marker.getElement().addEventListener('click', () => {
      this.periziaSselezionata = perizia;
      this.showDetailsPanel = true;
      this.mostraPercorsoPerizia();
    });
  }

  const tutteLeCoordinate: [number, number][] = [this.startPos.center];

  for (const perizia of this.perizie) {
    tutteLeCoordinate.push([perizia.coordinate.lng, perizia.coordinate.lat]);
  }

  if (this.perizie.length > 0) {
    this.mapService.adjustZoom(tutteLeCoordinate);
  }
  }

  caricaDati(){
      this.perizieService.getUtenti()?.subscribe({
        "next": (data: any) => {
        this.operatori = data
      },
      "error": (error: any) => {
        if (error.status == 403)
          this.router.navigate(["/login"])
        else
          this.errorMessage = error.error
      }
    })

    this.perizieService.getPerizie()?.subscribe({
      "next": async (data: any) => {
        this.perizie = data
        if (this.mapPronta) {
          await this.refreshMap();
        }
      },
      "error": (error: any) => {
        if (error.status == 403)
          this.router.navigate(["/login"])
        else
          this.errorMessage = error.error
      }
    })
  }

  selezionaOperatore(event:any){
    this.perizieService.getPerizie(event.target.value)?.subscribe({
        "next": async (data: any) => {
        this.perizie = data
        if (this.mapPronta) {
          await this.refreshMap();
        }
      },
      "error": (error: any) => {
        if (error.status == 403)
          this.router.navigate(["/login"])
        else
          this.errorMessage = error.error
      }
    })
  }

  closeDetailsPanel(): void {
    this.showDetailsPanel = false;
  }

  async mostraPercorsoPerizia(): Promise<void> {
    if (!this.periziaSselezionata || !this.startPos) {
      return;
    }

    const center: [number, number] = [
      this.periziaSselezionata.coordinate.lng,
      this.periziaSselezionata.coordinate.lat
    ];

    this.mapService.clearRoutes?.();
    const route = await this.mapService.drawSingleRoute(this.startPos.center, center, "#e8a020");
    if (route) {
      this.selectedRouteInfo = {
        distanceKm: route.distance / 1000,
        durationMin: Math.round(route.duration / 60),
      };
      this.mapService.adjustZoom([this.startPos.center, center]);
    }
  }

  ngOnDestroy(): void {
    this.mapService.clearMarkers?.();
    this.mapService.clearRoutes?.();
    this.mapService.map?.remove();
    this.mapService.map = null;
    this.mapPronta = false;
    this.startPos = null;
  }
}
