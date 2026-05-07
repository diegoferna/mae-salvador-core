import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { IsAuthenticatedGuard } from "../../../core/guards/IsAuthenticatedGuard";
import { RbacGuard } from "../../../core/guards/RbacGuard";
import { CadastroGestantePayload } from "./objects/CadastroGestantePayload";
import { CadastrarGestanteInput } from "./inputs/CadastrarGestanteInput";
import { GestanteService } from "../services/GestanteService";
import { SolicitarRecuperacaoSenhaInput } from "./inputs/SolicitarRecuperacaoSenhaInput";
import { SolicitarRecuperacaoSenhaPayload } from "./objects/SolicitarRecuperacaoSenhaPayload";
import { RedefinirSenhaGestanteInput } from "./inputs/RedefinirSenhaGestanteInput";
import { EscolherUnidadeInput } from "./inputs/EscolherUnidadeInput";
import { EscolhaUnidadePayload } from "./objects/EscolhaUnidadePayload";
import { ConfirmarOrientacaoInput } from "./inputs/ConfirmarOrientacaoInput";
import { ConfirmacaoOrientacaoPayload } from "./objects/ConfirmacaoOrientacaoPayload";
import { ProgramaSocialObject } from "./objects/ProgramaSocialObject";
import { BuscarPerguntaRecuperacaoSenhaPayload } from "./objects/BuscarPerguntaRecuperacaoSenhaPayload";
import { VerificarRespostaRecuperacaoSenhaInput } from "./inputs/VerificarRespostaRecuperacaoSenhaInput";
import { VerificarRespostaRecuperacaoSenhaPayload } from "./objects/VerificarRespostaRecuperacaoSenhaPayload";

@Resolver()
export class GestanteResolver {
  constructor(private readonly gestanteService: GestanteService) {}

  @Mutation(() => CadastroGestantePayload)
  cadastrarGestante(
    @Args("input", { type: () => CadastrarGestanteInput }) input: CadastrarGestanteInput,
  ): Promise<CadastroGestantePayload> {
    return this.gestanteService.cadastrar(input);
  }

  @Query(() => [ProgramaSocialObject])
  listarProgramasSociais(): Promise<ProgramaSocialObject[]> {
    return this.gestanteService.listarProgramasSociais();
  }

  @Mutation(() => SolicitarRecuperacaoSenhaPayload)
  solicitarRecuperacaoSenhaGestante(
    @Args("input", { type: () => SolicitarRecuperacaoSenhaInput }) input: SolicitarRecuperacaoSenhaInput,
  ): Promise<SolicitarRecuperacaoSenhaPayload> {
    return this.gestanteService.solicitarRecuperacaoSenha(input);
  }

  @Query(() => BuscarPerguntaRecuperacaoSenhaPayload)
  buscarPerguntaRecuperacaoSenhaGestante(
    @Args("cpfCns", { type: () => String }) cpfCns: string,
  ): Promise<BuscarPerguntaRecuperacaoSenhaPayload> {
    return this.gestanteService.buscarPerguntaRecuperacaoSenha(cpfCns);
  }

  @Mutation(() => VerificarRespostaRecuperacaoSenhaPayload)
  verificarRespostaRecuperacaoSenhaGestante(
    @Args("input", { type: () => VerificarRespostaRecuperacaoSenhaInput })
    input: VerificarRespostaRecuperacaoSenhaInput,
  ): Promise<VerificarRespostaRecuperacaoSenhaPayload> {
    return this.gestanteService.verificarRespostaRecuperacaoSenha(input);
  }

  @Mutation(() => Boolean)
  redefinirSenhaGestante(
    @Args("input", { type: () => RedefinirSenhaGestanteInput }) input: RedefinirSenhaGestanteInput,
  ): Promise<boolean> {
    return this.gestanteService.redefinirSenha(input).then((result) => result.ok);
  }

  @Mutation(() => EscolhaUnidadePayload)
  @UseGuards(IsAuthenticatedGuard, RbacGuard)
  escolherUnidadeGestante(
    @Args("input", { type: () => EscolherUnidadeInput }) input: EscolherUnidadeInput,
  ): Promise<EscolhaUnidadePayload> {
    return this.gestanteService.escolherUnidade(input);
  }

  @Mutation(() => ConfirmacaoOrientacaoPayload)
  @UseGuards(IsAuthenticatedGuard, RbacGuard)
  confirmarOrientacaoGestante(
    @Args("input", { type: () => ConfirmarOrientacaoInput }) input: ConfirmarOrientacaoInput,
  ): Promise<ConfirmacaoOrientacaoPayload> {
    return this.gestanteService.confirmarOrientacao(input);
  }
}
