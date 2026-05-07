import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AppConfig } from "../../core/AppConfig";

@Injectable()
export class NominatimAdapter {
  constructor(private readonly appConfig: AppConfig) {}

  async geocodificar(endereco: string): Promise<{ lat: number; lon: number } | null> {
    if (!endereco) return null;
    return this.withTimeout(async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", endereco);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "br");

      const response = await fetch(url, {
        headers: {
          "User-Agent": this.appConfig.nominatimUserAgent,
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new ServiceUnavailableException("nominatim_http_error");
      }
      const body = (await response.json()) as Array<{ lat: string; lon: string }>;
      const hit = body[0];
      if (!hit) return null;
      return { lat: Number(hit.lat), lon: Number(hit.lon) };
    });
  }

  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs = 2000): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ServiceUnavailableException("nominatim_timeout")), timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch {
      throw new ServiceUnavailableException("nominatim_unavailable");
    }
  }
}
