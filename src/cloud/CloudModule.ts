import { Module } from "@nestjs/common";
import { CoreModule } from "../core/CoreModule";
import { EsusAdapter } from "./adapters/EsusAdapter";
import { SoapCnsAdapter } from "./adapters/SoapCnsAdapter";

@Module({
  imports: [CoreModule],
  providers: [EsusAdapter, SoapCnsAdapter],
  exports: [EsusAdapter, SoapCnsAdapter],
})
export class CloudModule {}
