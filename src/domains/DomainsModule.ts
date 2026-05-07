import { Module } from "@nestjs/common";
import { AccountModule } from "./account/AccountModule";
import { AuthModule } from "./auth/AuthModule";
import { GestanteModule } from "./gestante/GestanteModule";
import { IntegracaoModule } from "./integracao/IntegracaoModule";
import { UnidadeModule } from "./unidade/UnidadeModule";

@Module({
  imports: [AccountModule, AuthModule, GestanteModule, IntegracaoModule, UnidadeModule],
})
export class DomainsModule {}
