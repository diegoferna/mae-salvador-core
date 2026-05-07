import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AppConfig } from "./AppConfig";
import { JwtService } from "./auth/JwtService";
import { IsAuthenticatedGuard } from "./guards/IsAuthenticatedGuard";
import { RbacGuard } from "./guards/RbacGuard";
import { PrismaService } from "./prisma/PrismaService";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
    }),
  ],
  providers: [AppConfig, PrismaService, JwtService, IsAuthenticatedGuard, RbacGuard],
  exports: [AppConfig, PrismaService, JwtService, IsAuthenticatedGuard, RbacGuard],
})
export class CoreModule {}
