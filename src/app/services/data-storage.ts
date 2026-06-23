import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataStorage {
  private http = inject(HttpClient);
  private REST_API_SERVER = "http://localhost:3001/api";

    public inviaRichiesta(method: string, resource: string, params: any = {}) {
        let url = this.REST_API_SERVER + resource;

        switch (method.toLowerCase()) {
            case 'get':
                return this.http.get(url, { params, withCredentials: true });

            case 'post':
                return this.http.post(url, params, { withCredentials: true });

            case 'put':
                return this.http.put(url, params, { withCredentials: true });

            case 'patch':
                return this.http.patch(url, params, { withCredentials: true });

            case 'delete':
                return this.http.delete(url, { params, withCredentials: true });

            default:
                return undefined
        }
    }
}
