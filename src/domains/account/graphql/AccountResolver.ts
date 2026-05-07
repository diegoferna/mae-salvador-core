import { Args, Query, Resolver } from "@nestjs/graphql";
import { BuscarCnsPayload } from "../../integracao/graphql/objects/BuscarCnsPayload";
import { AccountService } from "../services/AccountService";
import { BuscarCnsPorDadosInput } from "./inputs/BuscarCnsPorDadosInput";
import { VerificarCadastroPorDadosInput } from "./inputs/VerificarCadastroPorDadosInput";
import { VerificarCadastroPorCnsPayload } from "./objects/VerificarCadastroPorCnsPayload";
import { VerificarCadastroPorCpfPayload } from "./objects/VerificarCadastroPorCpfPayload";
import { VerificarCadastroPorDadosPayload } from "./objects/VerificarCadastroPorDadosPayload";

@Resolver()
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Query(() => VerificarCadastroPorCpfPayload)
  verificarCadastroPorCpf(
    @Args("cpf", { type: () => String }) cpf: string,
  ): Promise<VerificarCadastroPorCpfPayload> {
    return this.accountService.verificarCadastroPorCpf(cpf);
  }

  @Query(() => VerificarCadastroPorCnsPayload)
  verificarCadastroPorCns(
    @Args("cns", { type: () => String }) cns: string,
  ): Promise<VerificarCadastroPorCnsPayload> {
    return this.accountService.verificarCadastroPorCns(cns);
  }

  @Query(() => BuscarCnsPayload)
  buscarCnsPorDados(
    @Args("input", { type: () => BuscarCnsPorDadosInput }) input: BuscarCnsPorDadosInput,
  ): Promise<BuscarCnsPayload> {
    return this.accountService.buscarCnsPorDados(input);
  }

  @Query(() => VerificarCadastroPorDadosPayload)
  verificarCadastroPorDados(
    @Args("input", { type: () => VerificarCadastroPorDadosInput }) input: VerificarCadastroPorDadosInput,
  ): Promise<VerificarCadastroPorDadosPayload> {
    return this.accountService.verificarCadastroPorDados(input);
  }
}
