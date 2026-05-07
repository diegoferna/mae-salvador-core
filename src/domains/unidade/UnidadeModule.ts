import { Module } from "@nestjs/common";
import { CoreModule } from "../../core/CoreModule";
import { UnidadeService } from "./services/UnidadeService";

@Module({
  imports: [CoreModule],
  providers: [UnidadeService],
  exports: [UnidadeService],
})
export class UnidadeModule {}
