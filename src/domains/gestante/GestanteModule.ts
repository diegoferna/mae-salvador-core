import { Module } from "@nestjs/common";
import { CoreModule } from "../../core/CoreModule";
import { IntegracaoModule } from "../integracao/IntegracaoModule";
import { UnidadeModule } from "../unidade/UnidadeModule";
import { GestanteResolver } from "./graphql/GestanteResolver";
import { GestanteService } from "./services/GestanteService";

@Module({
  imports: [CoreModule, IntegracaoModule, UnidadeModule],
  providers: [GestanteResolver, GestanteService],
  exports: [GestanteService],
})
export class GestanteModule {}
