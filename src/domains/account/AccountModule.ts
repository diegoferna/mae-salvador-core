import { Module } from "@nestjs/common";
import { CoreModule } from "../../core/CoreModule";
import { IntegracaoModule } from "../integracao/IntegracaoModule";
import { AccountResolver } from "./graphql/AccountResolver";
import { AccountService } from "./services/AccountService";

@Module({
  imports: [CoreModule, IntegracaoModule],
  providers: [AccountResolver, AccountService],
  exports: [AccountService],
})
export class AccountModule {}
