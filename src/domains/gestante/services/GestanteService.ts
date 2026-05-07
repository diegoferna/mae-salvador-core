import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../../../core/prisma/PrismaService";
import { IntegracaoService } from "../../integracao/services/IntegracaoService";
import { UnidadeService } from "../../unidade/services/UnidadeService";
import { CadastrarGestanteInput } from "../graphql/inputs/CadastrarGestanteInput";
import { ConfirmarOrientacaoInput } from "../graphql/inputs/ConfirmarOrientacaoInput";
import { EscolherUnidadeInput } from "../graphql/inputs/EscolherUnidadeInput";
import { RedefinirSenhaGestanteInput } from "../graphql/inputs/RedefinirSenhaGestanteInput";
import { SolicitarRecuperacaoSenhaInput } from "../graphql/inputs/SolicitarRecuperacaoSenhaInput";
import { VerificarRespostaRecuperacaoSenhaInput } from "../graphql/inputs/VerificarRespostaRecuperacaoSenhaInput";
import { ProgramaSocialObject } from "../graphql/objects/ProgramaSocialObject";

type OpcaoPergunta = { id: string; texto: string };
type Challenge = {
  correctId: string;
  perguntaId: string;
  perguntaTexto: string;
  historicoPerguntas: string[];
  historicoTextos: string[];
};

@Injectable()
export class GestanteService {
  private readonly challenges = new Map<string, Challenge>();
  private readonly resetTokens = new Map<string, { usuarioId: string; expiracao: number }>();
  private static readonly TENTATIVAS_MAX = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integracaoService: IntegracaoService,
    private readonly unidadeService: UnidadeService,
  ) {}

  async cadastrar(input: CadastrarGestanteInput) {
    const cpf = input.cpf?.replace(/\D/g, "") ?? "";
    const cns = input.cns?.replace(/\D/g, "") ?? "";

    if (!cpf && !cns) {
      throw new BadRequestException("cpf_or_cns_required");
    }

    if (input.nis && input.nis.replace(/\D/g, "").length !== 11) {
      throw new BadRequestException("invalid_nis");
    }

    const existente = await this.prisma.usuario.findFirst({
      where: {
        OR: [cpf ? { cpf } : undefined, cns ? { cns } : undefined].filter(Boolean) as Array<
          { cpf?: string; cns?: string }
        >,
      },
      select: { id: true },
    });

    if (existente) {
      throw new ConflictException("user_already_exists");
    }

    const senhaHash = await bcrypt.hash(input.senha, 10);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          tipo: "gestante",
          cpf: cpf || null,
          cns: cns || null,
          senhaHash,
          status: "ativo",
        },
      });

      const pessoa = await tx.pessoa.create({
        data: {
          nome: input.nome,
        },
      });

      const gestante = await tx.gestante.create({
        data: {
          usuarioId: usuario.id,
          pessoaId: pessoa.id,
          origemCadastro: input.origemCadastro,
          status: "pendente",
        },
      });

      return { ok: true, id: gestante.id };
    });
  }

  async listarProgramasSociais(): Promise<ProgramaSocialObject[]> {
    const rows = await this.prisma.$queryRaw<Array<ProgramaSocialObject>>`
      SELECT
        ps.id::text AS id,
        ps.codigo::text AS codigo,
        ps.label::text AS label
      FROM programa_social ps
      ORDER BY ps.label ASC
    `;

    return rows;
  }

  async solicitarRecuperacaoSenha(input: SolicitarRecuperacaoSenhaInput) {
    const documento = input.cpfCns.replace(/\D/g, "");
    if (!documento) throw new BadRequestException("cpf_cns_required");

    const usuario = await this.prisma.usuario.findFirst({
      where: { tipo: "gestante", OR: [{ cpf: documento }, { cns: documento }] },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException("gestante_not_found");

    const agora = new Date();
    const tentativasAtual = await this.getTentativasRow(documento);
    if (tentativasAtual?.bloqueadoAte && tentativasAtual.bloqueadoAte > agora) {
      throw new HttpException("reset_temporarily_blocked", HttpStatus.TOO_MANY_REQUESTS);
    }

    const totalTentativas = (tentativasAtual?.tentativas ?? 0) + 1;
    const bloqueadoAte = totalTentativas >= 5 ? new Date(agora.getTime() + 15 * 60 * 1000) : null;
    const tokenTemporario = randomUUID();

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO gestante_esqueceu_senha_tentativas (cpf_cns, tentativas, bloqueado_ate, atualizado_em)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (cpf_cns) DO UPDATE
       SET tentativas = $2,
           bloqueado_ate = $3,
           atualizado_em = now()`,
      documento,
      totalTentativas,
      bloqueadoAte,
    );

    this.resetTokens.set(tokenTemporario, {
      usuarioId: usuario.id,
      expiracao: agora.getTime() + 10 * 60 * 1000,
    });

    return { sucesso: true, tokenTemporario };
  }

  async buscarPerguntaRecuperacaoSenha(cpfCns: string) {
    const documento = cpfCns.replace(/\D/g, "");
    if (documento.length !== 11 && documento.length !== 15) {
      throw new BadRequestException("invalid_cpf_cns");
    }

    if (await this.isBloqueado(documento)) {
      throw new HttpException("reset_temporarily_blocked", HttpStatus.TOO_MANY_REQUESTS);
    }

    const pergunta = await this.obterNovaPergunta(documento);
    if (!pergunta) {
      throw new NotFoundException("gestante_not_found");
    }

    this.challenges.set(documento, {
      correctId: pergunta.correctId,
      perguntaId: pergunta.perguntaId,
      perguntaTexto: pergunta.pergunta,
      historicoPerguntas: [pergunta.perguntaId],
      historicoTextos: [pergunta.pergunta],
    });

    return {
      pergunta: pergunta.pergunta,
      opcoes: pergunta.opcoes,
      tentativasRestantes: await this.getTentativasRestantes(documento),
    };
  }

  async verificarRespostaRecuperacaoSenha(input: VerificarRespostaRecuperacaoSenhaInput) {
    const documento = input.cpfCns.replace(/\D/g, "");
    const opcaoId = input.opcaoId.trim();
    if (!opcaoId || (documento.length !== 11 && documento.length !== 15)) {
      throw new BadRequestException("invalid_challenge_input");
    }

    if (await this.isBloqueado(documento)) {
      return {
        ok: false,
        erro: "Limite de tentativas alcançado. Tente novamente amanhã!",
        tentativasRestantes: 0,
      };
    }

    const challenge = this.challenges.get(documento);
    if (!challenge) {
      return {
        ok: false,
        erro: "Solicite uma nova pergunta (informe CPF/CNS novamente).",
      };
    }

    if (opcaoId !== challenge.correctId) {
      const tentativas = await this.registrarTentativaIncorreta(documento);
      this.challenges.delete(documento);
      if (tentativas >= GestanteService.TENTATIVAS_MAX) {
        return {
          ok: false,
          erro: "Limite de tentativas alcançado. Tente novamente amanhã!",
          tentativasRestantes: 0,
        };
      }

      const historicoPerguntas = Array.from(
        new Set([...(challenge.historicoPerguntas ?? []), challenge.perguntaId]),
      );
      const historicoTextos = Array.from(
        new Set([...(challenge.historicoTextos ?? []), challenge.perguntaTexto]),
      );
      const proxima = await this.obterNovaPergunta(documento, historicoPerguntas, historicoTextos);
      const tentativasRestantes = Math.max(GestanteService.TENTATIVAS_MAX - tentativas, 0);

      if (!proxima) {
        return {
          ok: false,
          erro: "Resposta incorreta. Tente novamente.",
          tentativasRestantes,
        };
      }

      this.challenges.set(documento, {
        correctId: proxima.correctId,
        perguntaId: proxima.perguntaId,
        perguntaTexto: proxima.pergunta,
        historicoPerguntas: [...historicoPerguntas, proxima.perguntaId],
        historicoTextos: [...historicoTextos, proxima.pergunta],
      });

      return {
        ok: false,
        erro: "Resposta incorreta. Tente a próxima pergunta.",
        proximaPergunta: true,
        pergunta: proxima.pergunta,
        opcoes: proxima.opcoes,
        tentativasRestantes,
      };
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { tipo: "gestante", OR: [{ cpf: documento }, { cns: documento }] },
      select: { id: true },
    });
    if (!usuario) {
      throw new NotFoundException("gestante_not_found");
    }

    const token = randomBytes(24).toString("hex");
    this.resetTokens.set(token, {
      usuarioId: usuario.id,
      expiracao: Date.now() + 15 * 60 * 1000,
    });

    await this.resetarTentativas(documento);
    this.challenges.delete(documento);

    return { ok: true, token };
  }

  async redefinirSenha(input: RedefinirSenhaGestanteInput) {
    const sessao = this.resetTokens.get(input.token);
    if (!sessao || sessao.expiracao < Date.now()) {
      this.resetTokens.delete(input.token);
      throw new BadRequestException("invalid_or_expired_reset_token");
    }

    const senhaHash = await bcrypt.hash(input.novaSenha, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: sessao.usuarioId },
        data: { senhaHash },
      });
    });
    this.resetTokens.delete(input.token);

    return { ok: true };
  }

  async escolherUnidade(input: EscolherUnidadeInput) {
    const gestante = await this.prisma.gestante.findUnique({
      where: { id: input.cadastroId },
      select: { id: true },
    });
    if (!gestante) throw new NotFoundException("gestante_not_found");

    const unidade = await this.unidadeService.resolverPorNome(input.nomeUnidade);
    await this.prisma.$transaction(async (tx) => {
      await tx.gestanteVinculo.upsert({
        where: { gestanteId: gestante.id },
        update: { ubsId: unidade.id },
        create: { gestanteId: gestante.id, ubsId: unidade.id },
      });

      await tx.gestanteUnidadeEscolha.create({
        data: {
          gestanteId: gestante.id,
          ubsId: unidade.id,
          unidadeEscolhidaNome: input.nomeUnidade,
          unidadeEscolhidaOrigem: input.origem,
        },
      });
    });

    return { sucesso: true, unidadeId: unidade.id, unidadeNome: unidade.nome };
  }

  async confirmarOrientacao(input: ConfirmarOrientacaoInput) {
    if (!input.cns && !input.cadastroId) {
      throw new BadRequestException("cns_or_cadastro_id_required");
    }

    if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) {
      throw new BadRequestException("invalid_latitude");
    }
    if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
      throw new BadRequestException("invalid_longitude");
    }

    let cns = input.cns?.replace(/\D/g, "");
    if (!cns && input.cadastroId) {
      const gestante = await this.prisma.gestante.findUnique({
        where: { id: input.cadastroId },
        include: { usuario: { select: { cns: true, cpf: true } } },
      });
      if (!gestante) throw new NotFoundException("gestante_not_found");

      cns = gestante.usuario.cns ?? undefined;
      if (!cns && gestante.usuario.cpf) {
        const cnsResolve = await this.integracaoService.buscarCns(gestante.usuario.cpf);
        if (cnsResolve.sucesso && cnsResolve.cidadao?.cns) cns = cnsResolve.cidadao.cns;
      }
    }

    if (!cns) throw new BadRequestException("cns_not_resolved");

    let lat = input.latitude;
    let lon = input.longitude;
    if ((lat === undefined || lon === undefined) && input.cadastroId) {
      const endereco = await this.prisma.endereco.findFirst({
        where: { pessoa: { gestante: { is: { id: input.cadastroId } } } },
        select: { logradouro: true, numero: true, bairro: true, cep: true },
      });
      if (endereco) {
        const query = [endereco.logradouro, endereco.numero, endereco.bairro, "Salvador", "BA", endereco.cep]
          .filter(Boolean)
          .join(", ");
        const geocoded = await this.integracaoService.geocodificarEndereco(query);
        if (geocoded) {
          lat = geocoded.lat;
          lon = geocoded.lon;
        }
      }
    }

    const mensagem = await this.integracaoService.confirmarOrientacao(cns, lat, lon);
    return { mensagem };
  }

  private formatDateBr(isoDate: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }

  private gerarOpcoes(correta: string, tipo: string): OpcaoPergunta[] {
    const opcoesFalsas: Record<string, string[]> = {
      nome: ["Ana Maria Santos", "Fernanda Oliveira", "Carla Souza Lima", "Patricia Costa"],
      nomeMae: ["Maria da Silva", "Ana Paula Oliveira", "Francisca Santos", "Tereza Costa"],
      nomePai: ["Jose da Silva", "Carlos Oliveira", "Antonio Souza", "Roberto Lima"],
      data: ["15/05/1990", "20/11/1988", "10/03/1992", "22/07/1985"],
    };
    const falsas = (opcoesFalsas[tipo] ?? opcoesFalsas.nome).filter((x) => x !== correta);
    while (falsas.length < 2) falsas.push(`Opcao ${falsas.length + 1}`);
    const todas = [correta, falsas[0], falsas[1]];
    for (let i = todas.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [todas[i], todas[j]] = [todas[j], todas[i]];
    }
    return todas.map((texto) => ({ id: randomBytes(8).toString("hex"), texto }));
  }

  private async obterNovaPergunta(
    documento: string,
    evitarPerguntaIds: string[] = [],
    evitarTextos: string[] = [],
  ): Promise<{ pergunta: string; opcoes: OpcaoPergunta[]; correctId: string; perguntaId: string } | null> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { tipo: "gestante", OR: [{ cpf: documento }, { cns: documento }] },
      include: { gestante: { include: { pessoa: true } } },
    });
    if (!usuario) return null;

    const integracao = await this.integracaoService.buscarCns(documento);
    const cidadao = integracao.sucesso ? integracao.cidadao : undefined;
    const nome = cidadao?.nome?.trim() || usuario.gestante?.pessoa?.nome?.trim() || "";
    const nomeMae = cidadao?.nomeMae?.trim() || "";
    const nomePai = cidadao?.nomePai?.trim() || "";
    const dataNascimento = cidadao?.dataNascimento?.trim() || "";

    const tipos = [
      { id: "nome", pergunta: "Qual o nome completo cadastrado?", valor: nome, tipoBase: "nome" },
      { id: "nome_alt", pergunta: "Informe o nome completo registrado.", valor: nome, tipoBase: "nome" },
      { id: "nomeMae", pergunta: "Qual o nome da mae?", valor: nomeMae, tipoBase: "nomeMae" },
      { id: "nomeMae_alt", pergunta: "Informe o nome da mae cadastrado.", valor: nomeMae, tipoBase: "nomeMae" },
      { id: "nomePai", pergunta: "Qual o nome do pai?", valor: nomePai, tipoBase: "nomePai" },
      { id: "nomePai_alt", pergunta: "Informe o nome do pai cadastrado.", valor: nomePai, tipoBase: "nomePai" },
      {
        id: "data",
        pergunta: "Qual a data de nascimento?",
        valor: dataNascimento ? this.formatDateBr(dataNascimento.slice(0, 10)) : "",
        tipoBase: "data",
      },
      {
        id: "data_alt",
        pergunta: "Informe a data de nascimento cadastrada.",
        valor: dataNascimento ? this.formatDateBr(dataNascimento.slice(0, 10)) : "",
        tipoBase: "data",
      },
    ].filter(
      (t) =>
        t.valor &&
        t.valor !== "IGNORADA" &&
        t.valor !== "IGNORADO" &&
        !/SEM\s*INFORMACAO/i.test(t.valor),
    );
    if (!tipos.length) return null;

    const tiposSemRepetir = tipos.filter(
      (t) => !evitarPerguntaIds.includes(t.id) && !evitarTextos.includes(t.pergunta),
    );
    const poolEscolha =
      tiposSemRepetir.length > 0
        ? tiposSemRepetir
        : tipos.filter((t) => t.id !== evitarPerguntaIds[evitarPerguntaIds.length - 1]);
    const poolFinal = poolEscolha.length > 0 ? poolEscolha : tipos;
    const escolhido = poolFinal[Math.floor(Math.random() * poolFinal.length)];
    const opcoes = this.gerarOpcoes(escolhido.valor, escolhido.tipoBase);
    const correctId = opcoes.find((o) => o.texto === escolhido.valor)?.id;
    if (!correctId) return null;
    return { pergunta: escolhido.pergunta, opcoes, correctId, perguntaId: escolhido.id };
  }

  private getProximoDiaUTCDate(): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private async isBloqueado(cpfCns: string): Promise<boolean> {
    const row = await this.getTentativasRow(cpfCns);
    if (!row) return false;
    const bloqueadoAteMs = row.bloqueadoAte ? row.bloqueadoAte.getTime() : 0;
    if (bloqueadoAteMs > 0 && Date.now() >= bloqueadoAteMs) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE gestante_esqueceu_senha_tentativas
         SET tentativas = 0, bloqueado_ate = NULL, atualizado_em = now()
         WHERE cpf_cns = $1`,
        cpfCns,
      );
      return false;
    }
    return row.tentativas >= GestanteService.TENTATIVAS_MAX && bloqueadoAteMs > Date.now();
  }

  private async getTentativasRestantes(cpfCns: string): Promise<number> {
    const row = await this.getTentativasRow(cpfCns);
    if (!row) return GestanteService.TENTATIVAS_MAX;
    const bloqueadoAteMs = row.bloqueadoAte ? row.bloqueadoAte.getTime() : 0;
    if (bloqueadoAteMs > 0 && Date.now() >= bloqueadoAteMs) return GestanteService.TENTATIVAS_MAX;
    return Math.max(GestanteService.TENTATIVAS_MAX - row.tentativas, 0);
  }

  private async registrarTentativaIncorreta(cpfCns: string): Promise<number> {
    const atual = await this.getTentativasRow(cpfCns);
    const resetado = atual?.bloqueadoAte && atual.bloqueadoAte.getTime() <= Date.now();
    const tentativas = resetado ? 1 : (atual?.tentativas ?? 0) + 1;
    const bloqueadoAte =
      tentativas >= GestanteService.TENTATIVAS_MAX ? this.getProximoDiaUTCDate() : null;
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO gestante_esqueceu_senha_tentativas (cpf_cns, tentativas, bloqueado_ate, atualizado_em)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (cpf_cns) DO UPDATE
       SET tentativas = $2,
           bloqueado_ate = $3,
           atualizado_em = now()`,
      cpfCns,
      tentativas,
      bloqueadoAte,
    );
    return tentativas;
  }

  private async resetarTentativas(cpfCns: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM gestante_esqueceu_senha_tentativas WHERE cpf_cns = $1`,
      cpfCns,
    );
  }

  private async getTentativasRow(
    cpfCns: string,
  ): Promise<{ tentativas: number; bloqueadoAte: Date | null } | null> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ tentativas: number; bloqueado_ate: Date | null }>>(
      `SELECT tentativas, bloqueado_ate
       FROM gestante_esqueceu_senha_tentativas
       WHERE cpf_cns = $1
       LIMIT 1`,
      cpfCns,
    );
    const row = rows[0];
    if (!row) return null;
    return { tentativas: Number(row.tentativas ?? 0), bloqueadoAte: row.bloqueado_ate ?? null };
  }

}
