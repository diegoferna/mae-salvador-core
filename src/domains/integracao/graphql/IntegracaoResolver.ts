import { Args, Query, Resolver } from "@nestjs/graphql";
import { IntegracaoService } from "../services/IntegracaoService";
import { BuscarCepInput } from "./inputs/BuscarCepInput";
import { BuscarCnsInput } from "./inputs/BuscarCnsInput";
import { CepObject } from "./objects/CepObject";
import { BuscarCnsPayload } from "./objects/BuscarCnsPayload";

@Resolver()
export class IntegracaoResolver {
  constructor(private readonly integracaoService: IntegracaoService) {}

  @Query(() => CepObject)
  buscarCep(@Args("input", { type: () => BuscarCepInput }) input: BuscarCepInput): Promise<CepObject> {
    return this.integracaoService.buscarCep(input.cep);
  }

  @Query(() => BuscarCnsPayload)
  buscarCns(@Args("input", { type: () => BuscarCnsInput }) input: BuscarCnsInput): Promise<BuscarCnsPayload> {
    return this.integracaoService.buscarCns(input.documento);
  }
}
