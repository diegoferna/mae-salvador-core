import { Module } from "@nestjs/common";
import { CoreModule } from "../core/CoreModule";
import { EsusAdapter } from "./adapters/EsusAdapter";
import { NominatimAdapter } from "./adapters/NominatimAdapter";
import { SoapCnsAdapter } from "./adapters/SoapCnsAdapter";

@Module({
  imports: [CoreModule],
  providers: [EsusAdapter, SoapCnsAdapter, NominatimAdapter],
  exports: [EsusAdapter, SoapCnsAdapter, NominatimAdapter],
})
export class CloudModule {}
