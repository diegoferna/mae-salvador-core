import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AppConfig {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  get appDatabaseUrl(): string {
    return this.must("APP_DATABASE_URL");
  }

  get esusDatabaseUrl(): string {
    return this.must("ESUS_DATABASE_URL");
  }

  get esusDatabaseUrlOptional(): string | null {
    const value = this.configService.get<string>("ESUS_DATABASE_URL")?.trim();
    return value || null;
  }

  get jwtSecret(): string {
    return this.must("JWT_SECRET");
  }

  get cnsFederalUrl(): string {
    return this.must("CNS_FEDERAL_URL");
  }

  get cnsFederalUrlWithDefault(): string {
    return this.configService.get<string>("CNS_FEDERAL_URL")?.trim() || "http://177.20.6.29:8181/JAXWebserviceCnsMS/ServicoCns";
  }

  get cnsFederalUser(): string {
    return this.must("CNS_FEDERAL_USER");
  }

  get cnsFederalPassword(): string {
    return this.must("CNS_FEDERAL_PASSWORD");
  }

  get isCnsFederalConfigured(): boolean {
    const user = this.configService.get<string>("CNS_FEDERAL_USER")?.trim();
    const password = this.configService.get<string>("CNS_FEDERAL_PASSWORD");
    return Boolean(user && password);
  }

  private must(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required env var: ${key}`);
    }
    return value;
  }
}
