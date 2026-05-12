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
import { OrientacaoMaeSalvadorPayload } from "./objects/OrientacaoMaeSalvadorPayload";
import { ProgramaSocialObject } from "./objects/ProgramaSocialObject";
import { BuscarPerguntaRecuperacaoSenhaPayload } from "./objects/BuscarPerguntaRecuperacaoSenhaPayload";
import { VerificarRespostaRecuperacaoSenhaInput } from "./inputs/VerificarRespostaRecuperacaoSenhaInput";
import { VerificarRespostaRecuperacaoSenhaPayload } from "./objects/VerificarRespostaRecuperacaoSenhaPayload";
import { ObterAtualizacaoCadastralGestanteInput } from "./inputs/ObterAtualizacaoCadastralGestanteInput";
import { AtualizacaoCadastralGestanteObject } from "./objects/AtualizacaoCadastralGestanteObject";
import { BuscarCpfCnsComplementarGestanteInput } from "./inputs/BuscarCpfCnsComplementarGestanteInput";
import { BuscarCpfCnsComplementarGestantePayload } from "./objects/BuscarCpfCnsComplementarGestantePayload";
import { AtualizarCadastroGestanteInput } from "./inputs/AtualizarCadastroGestanteInput";
import { AtualizarCadastroGestantePayload } from "./objects/AtualizarCadastroGestantePayload";
import { AvaliarUnidadePosAtualizacaoInput } from "./inputs/AvaliarUnidadePosAtualizacaoInput";
import { AvaliarUnidadePosAtualizacaoPayload } from "./objects/AvaliarUnidadePosAtualizacaoPayload";
import { ConfirmarEscolhaUnidadePosAtualizacaoInput } from "./inputs/ConfirmarEscolhaUnidadePosAtualizacaoInput";
import { ConfirmarEscolhaUnidadePosAtualizacaoPayload } from "./objects/ConfirmarEscolhaUnidadePosAtualizacaoPayload";

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
  escolherUnidadeGestante(
    @Args("input", { type: () => EscolherUnidadeInput }) input: EscolherUnidadeInput,
  ): Promise<EscolhaUnidadePayload> {
    return this.gestanteService.escolherUnidade(input);
  }

  @Mutation(() => OrientacaoMaeSalvadorPayload)
  confirmarOrientacaoGestante(
    @Args("input", { type: () => ConfirmarOrientacaoInput }) input: ConfirmarOrientacaoInput,
  ): Promise<OrientacaoMaeSalvadorPayload> {
    return this.gestanteService.confirmarOrientacao(input);
  }

  @Query(() => AtualizacaoCadastralGestanteObject)
  @UseGuards(IsAuthenticatedGuard, RbacGuard)
  obterAtualizacaoCadastralGestante(
    @Args("input", { type: () => ObterAtualizacaoCadastralGestanteInput })
    input: ObterAtualizacaoCadastralGestanteInput,
  ): Promise<AtualizacaoCadastralGestanteObject> {
    return this.gestanteService.obterAtualizacaoCadastral(input.cadastroId);
  }

  @Query(() => BuscarCpfCnsComplementarGestantePayload)
  @UseGuards(IsAuthenticatedGuard, RbacGuard)
  buscarCpfCnsComplementarGestante(
    @Args("input", { type: () => BuscarCpfCnsComplementarGestanteInput })
    input: BuscarCpfCnsComplementarGestanteInput,
  ): Promise<BuscarCpfCnsComplementarGestantePayload> {
    return this.gestanteService.buscarCpfCnsComplementar(input);
  }

  @Mutation(() => AtualizarCadastroGestantePayload)
  @UseGuards(IsAuthenticatedGuard, RbacGuard)
  atualizarCadastroGestante(
    @Args("input", { type: () => AtualizarCadastroGestanteInput }) input: AtualizarCadastroGestanteInput,
  ): Promise<AtualizarCadastroGestantePayload> {
    return this.gestanteService.atualizarCadastro(input);
  }

  @Query(() => AvaliarUnidadePosAtualizacaoPayload)
  @UseGuards(IsAuthenticatedGuard, RbacGuard)
  avaliarUnidadePosAtualizacao(
    @Args("input", { type: () => AvaliarUnidadePosAtualizacaoInput })
    input: AvaliarUnidadePosAtualizacaoInput,
  ): Promise<AvaliarUnidadePosAtualizacaoPayload> {
    return this.gestanteService.avaliarUnidadePosAtualizacao(input.cadastroId);
  }

  @Mutation(() => ConfirmarEscolhaUnidadePosAtualizacaoPayload)
  @UseGuards(IsAuthenticatedGuard, RbacGuard)
  confirmarEscolhaUnidadePosAtualizacao(
    @Args("input", { type: () => ConfirmarEscolhaUnidadePosAtualizacaoInput })
    input: ConfirmarEscolhaUnidadePosAtualizacaoInput,
  ): Promise<ConfirmarEscolhaUnidadePosAtualizacaoPayload> {
    return this.gestanteService.confirmarEscolhaUnidadePosAtualizacao(input);
  }
}
