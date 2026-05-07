import { Module } from "@nestjs/common";
import { CloudModule } from "../../cloud/CloudModule";
import { CoreModule } from "../../core/CoreModule";
import { IntegracaoResolver } from "./graphql/IntegracaoResolver";
import { IntegracaoService } from "./services/IntegracaoService";

@Module({
  imports: [CoreModule, CloudModule],
  providers: [IntegracaoService, IntegracaoResolver],
  exports: [IntegracaoService],
})
export class IntegracaoModule {}
