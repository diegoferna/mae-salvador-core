import { Module } from "@nestjs/common";
import { CoreModule } from "../../core/CoreModule";
import { AuthResolver } from "./graphql/AuthResolver";
import { AuthService } from "./services/AuthService";
import { PasswordService } from "./services/PasswordService";

@Module({
  imports: [CoreModule],
  providers: [AuthResolver, AuthService, PasswordService],
  exports: [PasswordService],
})
export class AuthModule {}
