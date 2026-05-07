import { INestApplication, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppConfig } from "../AppConfig";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(AppConfig) appConfig: AppConfig) {
    super({
      datasources: {
        db: { url: appConfig.appDatabaseUrl },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.logDatabaseContext();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    this.$on("beforeExit" as never, async () => {
      await app.close();
    });
  }

  private async logDatabaseContext(): Promise<void> {
    try {
      const context = await this.$queryRaw<Array<{ db: string; schema: string }>>`
        SELECT current_database()::text AS db, current_schema()::text AS schema
      `;
      const tableCheck = await this.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'usuario'
        )::boolean AS "exists"
      `;

      const db = context[0]?.db ?? "unknown";
      const schema = context[0]?.schema ?? "unknown";
      const exists = tableCheck[0]?.exists ?? false;
      this.logger.log(`DB context -> database=${db}, schema=${schema}, public.usuario_exists=${exists}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to inspect DB context: ${message}`);
    }
  }
}
