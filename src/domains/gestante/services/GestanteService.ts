import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../../../core/prisma/PrismaService";
import { IntegracaoService } from "../../integracao/services/IntegracaoService";
import { UnidadeService } from "../../unidade/services/UnidadeService";
import { CadastrarGestanteInput } from "../graphql/inputs/CadastrarGestanteInput";
import { AtualizarCadastroGestanteInput } from "../graphql/inputs/AtualizarCadastroGestanteInput";
import { BuscarCpfCnsComplementarGestanteInput } from "../graphql/inputs/BuscarCpfCnsComplementarGestanteInput";
import { ConfirmarEscolhaUnidadePosAtualizacaoInput } from "../graphql/inputs/ConfirmarEscolhaUnidadePosAtualizacaoInput";
import { ConfirmarOrientacaoInput } from "../graphql/inputs/ConfirmarOrientacaoInput";
import { EscolherUnidadeInput } from "../graphql/inputs/EscolherUnidadeInput";
import { RedefinirSenhaGestanteInput } from "../graphql/inputs/RedefinirSenhaGestanteInput";
import { SolicitarRecuperacaoSenhaInput } from "../graphql/inputs/SolicitarRecuperacaoSenhaInput";
import { VerificarRespostaRecuperacaoSenhaInput } from "../graphql/inputs/VerificarRespostaRecuperacaoSenhaInput";
import { AtualizacaoCadastralGestanteObject } from "../graphql/objects/AtualizacaoCadastralGestanteObject";
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

  async obterAtualizacaoCadastral(cadastroId: string): Promise<AtualizacaoCadastralGestanteObject> {
    try {
      const gestante = await this.prisma.gestante.findUnique({
        where: { id: cadastroId },
        include: {
          usuario: true,
          pessoa: true,
          contato: true,
          deficiencias: true,
          programasSociais: true,
        },
      });
      if (!gestante) {
        throw new NotFoundException("gestante_not_found");
      }
      const endereco = await this.prisma.endereco.findFirst({
        where: { pessoaId: gestante.pessoaId },
        orderBy: { id: "desc" },
      });
      return {
        cadastroId: gestante.id,
        cpf: gestante.usuario.cpf ?? undefined,
        cns: gestante.usuario.cns ?? undefined,
        nomeCompleto: gestante.pessoa.nome ?? undefined,
        nomeSocial: gestante.pessoa.nomeSocial ?? undefined,
        nomeMae: gestante.pessoa.nomeMae ?? undefined,
        nomePai: gestante.pessoa.nomePai ?? undefined,
        dataNascimento: gestante.pessoa.dataNascimento?.toISOString().slice(0, 10),
        racaCor: gestante.pessoa.racaCor ?? undefined,
        sexo: gestante.pessoa.sexo ?? undefined,
        identidadeGenero: gestante.pessoa.identidadeGenero ?? undefined,
        orientacaoSexual: gestante.pessoa.orientacaoSexual ?? undefined,
        possuiDeficiencia: gestante.possuiDeficiencia ?? undefined,
        deficiencias: gestante.deficiencias.map((item: { tipo: string }) => item.tipo),
        dddCelularPrincipal: gestante.contato?.dddCelularPrincipal ?? undefined,
        celularPrincipal: gestante.contato?.celularPrincipal ?? undefined,
        celularPrincipalWhatsapp: gestante.contato?.celularPrincipalWhatsapp ?? undefined,
        dddCelularAlternativo: gestante.contato?.dddCelularAlternativo ?? undefined,
        celularAlternativo: gestante.contato?.celularAlternativo ?? undefined,
        celularAlternativoWhatsapp: gestante.contato?.celularAlternativoWhatsapp ?? undefined,
        dddResidencial: gestante.contato?.dddResidencial ?? undefined,
        telefoneResidencial: gestante.contato?.telefoneResidencial ?? undefined,
        email: gestante.pessoa.email ?? undefined,
        cep: endereco?.cep ?? undefined,
        municipio: endereco?.municipio ?? undefined,
        tipoLogradouro: endereco?.tipoLogradouro ?? undefined,
        logradouro: endereco?.logradouro ?? undefined,
        bairro: endereco?.bairro ?? undefined,
        numero: endereco?.numero ?? undefined,
        complemento: endereco?.complemento ?? undefined,
        pontoReferencia: endereco?.pontoReferencia ?? undefined,
        programasSociais: gestante.programasSociais.map((item: { programaCodigo: string }) => item.programaCodigo),
        nis: gestante.pessoa.nis ?? undefined,
        planoSaudeParticular: gestante.planoSaudeParticular ?? undefined,
        alergiasConhecidas: gestante.alergiasConhecidas ?? undefined,
        medicamentosEmUso: gestante.medicamentosEmUso ?? undefined,
        doencasPreexistentes: gestante.doencasPreexistentes ?? undefined,
      };
    } catch (error) {
      if (!this.isLegacySchemaMismatchError(error)) {
        throw error;
      }

      const rows = await this.prisma.$queryRaw<
        Array<{
          cadastro_id: string;
          cpf: string | null;
          cns: string | null;
          nome_completo: string | null;
          nome_social: string | null;
          nome_mae: string | null;
          nome_pai: string | null;
          data_nascimento: Date | null;
          raca_cor: string | null;
          sexo: string | null;
          identidade_genero: string | null;
          orientacao_sexual: string | null;
          possui_deficiencia: boolean | null;
          deficiencia: string | null;
          email: string | null;
          telefone: string | null;
          email_contato: string | null;
          ddd_celular_principal: string | null;
          celular_principal: string | null;
          celular_principal_whatsapp: boolean | null;
          ddd_celular_alternativo: string | null;
          celular_alternativo: string | null;
          celular_alternativo_whatsapp: boolean | null;
          ddd_residencial: string | null;
          telefone_residencial: string | null;
          cep: string | null;
          tipo_logradouro: string | null;
          logradouro: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          municipio: string | null;
          ponto_referencia: string | null;
          nis: string | null;
          programas_sociais: string[] | null;
          alergias: string | null;
          doencas_conhecidas: string | null;
          medicacoes_em_uso: string | null;
        }>
      >`
        SELECT
          g.id::text AS cadastro_id,
          u.cpf::text AS cpf,
          u.cns::text AS cns,
          p.nome_completo::text AS nome_completo,
          p.nome_social::text AS nome_social,
          p.nome_mae::text AS nome_mae,
          p.nome_pai::text AS nome_pai,
          p.data_nascimento AS data_nascimento,
          p.raca_cor::text AS raca_cor,
          p.sexo::text AS sexo,
          ig.codigo::text AS identidade_genero,
          osx.codigo::text AS orientacao_sexual,
          p.possui_deficiencia AS possui_deficiencia,
          p.deficiencia::text AS deficiencia,
          u.email::text AS email,
          u.telefone::text AS telefone,
          ct.email_contato::text AS email_contato,
          CASE WHEN length(COALESCE(ct.celular_principal, '')) >= 10 THEN substring(ct.celular_principal from 1 for 2) ELSE NULL END AS ddd_celular_principal,
          CASE WHEN length(COALESCE(ct.celular_principal, '')) >= 10 THEN substring(ct.celular_principal from 3) ELSE NULL END AS celular_principal,
          ct.celular_principal_whatsapp AS celular_principal_whatsapp,
          CASE WHEN length(COALESCE(ct.celular_alternativo, '')) >= 10 THEN substring(ct.celular_alternativo from 1 for 2) ELSE NULL END AS ddd_celular_alternativo,
          CASE WHEN length(COALESCE(ct.celular_alternativo, '')) >= 10 THEN substring(ct.celular_alternativo from 3) ELSE NULL END AS celular_alternativo,
          ct.celular_alternativo_whatsapp AS celular_alternativo_whatsapp,
          CASE WHEN length(COALESCE(ct.telefone_residencial, '')) >= 10 THEN substring(ct.telefone_residencial from 1 for 2) ELSE NULL END AS ddd_residencial,
          CASE WHEN length(COALESCE(ct.telefone_residencial, '')) >= 10 THEN substring(ct.telefone_residencial from 3) ELSE NULL END AS telefone_residencial,
          e.cep::text AS cep,
          e.tipo_logradouro::text AS tipo_logradouro,
          e.logradouro::text AS logradouro,
          e.numero::text AS numero,
          e.complemento::text AS complemento,
          e.bairro::text AS bairro
          ,
          e.municipio::text AS municipio,
          e.ponto_referencia::text AS ponto_referencia,
          gps.nis::text AS nis,
          (
            SELECT COALESCE(array_agg(ps.codigo::text ORDER BY ps.ordem), ARRAY[]::text[])
            FROM gestante_programa_social gps2
            INNER JOIN programa_social ps ON ps.id = gps2.programa_social_id
            WHERE gps2.gestante_id = g.id
          ) AS programas_sociais,
          gc.alergias::text AS alergias,
          gc.doencas_conhecidas::text AS doencas_conhecidas,
          gc.medicacoes_em_uso::text AS medicacoes_em_uso
        FROM gestante g
        INNER JOIN usuario u ON u.id = g.usuario_id
        INNER JOIN pessoa p ON p.id = g.pessoa_id
        LEFT JOIN identidade_genero ig ON ig.id = p.identidade_genero_id
        LEFT JOIN orientacao_sexual osx ON osx.id = p.orientacao_sexual_id
        LEFT JOIN LATERAL (
          SELECT gps1.nis
          FROM gestante_programa_social gps1
          WHERE gps1.gestante_id = g.id
          ORDER BY gps1.criado_em DESC NULLS LAST
          LIMIT 1
        ) gps ON true
        LEFT JOIN gestante_clinico gc ON gc.gestante_id = g.id
        LEFT JOIN LATERAL (
          SELECT
            MAX(CASE WHEN c.tipo = 'telefone_celular' AND c.principal THEN c.valor END)::text AS celular_principal,
            BOOL_OR(CASE WHEN c.tipo = 'telefone_celular' AND c.principal THEN c.whatsapp ELSE false END) AS celular_principal_whatsapp,
            MAX(CASE WHEN c.tipo = 'telefone_celular' AND NOT c.principal THEN c.valor END)::text AS celular_alternativo,
            BOOL_OR(CASE WHEN c.tipo = 'telefone_celular' AND NOT c.principal THEN c.whatsapp ELSE false END) AS celular_alternativo_whatsapp,
            MAX(CASE WHEN c.tipo = 'telefone_residencial' THEN c.valor END)::text AS telefone_residencial,
            MAX(CASE WHEN c.tipo = 'email' THEN c.valor END)::text AS email_contato
          FROM contato c
          WHERE c.pessoa_id = p.id
        ) ct ON true
        LEFT JOIN LATERAL (
          SELECT endr.cep, endr.tipo_logradouro, endr.logradouro, endr.numero, endr.complemento, endr.bairro, endr.municipio, endr.ponto_referencia
          FROM endereco endr
          WHERE endr.pessoa_id = p.id
          ORDER BY endr.atualizado_em DESC NULLS LAST, endr.criado_em DESC NULLS LAST
          LIMIT 1
        ) e ON true
        WHERE g.id = ${cadastroId}::uuid
        LIMIT 1
      `;

      const legacy = rows[0];
      if (!legacy) {
        throw new NotFoundException("gestante_not_found");
      }

      return {
        cadastroId: legacy.cadastro_id,
        cpf: legacy.cpf ?? undefined,
        cns: legacy.cns ?? undefined,
        nomeCompleto: legacy.nome_completo ?? undefined,
        nomeSocial: legacy.nome_social ?? undefined,
        nomeMae: legacy.nome_mae ?? undefined,
        nomePai: legacy.nome_pai ?? undefined,
        dataNascimento: legacy.data_nascimento ? legacy.data_nascimento.toISOString().slice(0, 10) : undefined,
        racaCor: legacy.raca_cor ?? undefined,
        sexo: legacy.sexo ?? undefined,
        identidadeGenero: legacy.identidade_genero ?? undefined,
        orientacaoSexual: legacy.orientacao_sexual ?? undefined,
        possuiDeficiencia: legacy.possui_deficiencia ?? undefined,
        deficiencias: legacy.deficiencia ? legacy.deficiencia.split(",").map((item: string) => item.trim()).filter(Boolean) : [],
        dddCelularPrincipal: legacy.ddd_celular_principal ?? undefined,
        celularPrincipal: legacy.celular_principal ?? legacy.telefone ?? undefined,
        celularPrincipalWhatsapp: legacy.celular_principal_whatsapp ?? undefined,
        dddCelularAlternativo: legacy.ddd_celular_alternativo ?? undefined,
        celularAlternativo: legacy.celular_alternativo ?? undefined,
        celularAlternativoWhatsapp: legacy.celular_alternativo_whatsapp ?? undefined,
        dddResidencial: legacy.ddd_residencial ?? undefined,
        telefoneResidencial: legacy.telefone_residencial ?? undefined,
        email: legacy.email_contato ?? legacy.email ?? undefined,
        cep: legacy.cep ?? undefined,
        tipoLogradouro: legacy.tipo_logradouro ?? undefined,
        logradouro: legacy.logradouro ?? undefined,
        numero: legacy.numero ?? undefined,
        complemento: legacy.complemento ?? undefined,
        bairro: legacy.bairro ?? undefined,
        municipio: legacy.municipio ?? undefined,
        pontoReferencia: legacy.ponto_referencia ?? undefined,
        nis: legacy.nis ?? undefined,
        programasSociais: legacy.programas_sociais ?? [],
        alergiasConhecidas: legacy.alergias ? true : undefined,
        doencasPreexistentes: legacy.doencas_conhecidas ? true : undefined,
        medicamentosEmUso: legacy.medicacoes_em_uso ? true : undefined,
      };
    }
  }

  async buscarCpfCnsComplementar(input: BuscarCpfCnsComplementarGestanteInput) {
    const cpf = input.cpf?.replace(/\D/g, "");
    const cns = input.cns?.replace(/\D/g, "");
    if (!cpf && !cns) {
      throw new BadRequestException("cpf_or_cns_required");
    }
    const documentoBusca = cpf || cns;
    const integracao = await this.integracaoService.buscarCns(documentoBusca!);
    if (!integracao.sucesso || !integracao.cidadao) {
      throw new NotFoundException("cpf_cns_not_found");
    }
    return {
      cpf: cpf || integracao.cidadao.cpf,
      cns: cns || integracao.cidadao.cns,
      fonte: integracao.fonte,
    };
  }

  async atualizarCadastro(input: AtualizarCadastroGestanteInput) {
    this.validarAtualizacaoCadastral(input);
    const gestanteRows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT g.id::text, g.usuario_id::text, g.pessoa_id::text
      FROM gestante g
      WHERE g.id = $1::uuid
      LIMIT 1
      `,
      input.cadastroId,
    )) as Array<{ id: string; usuario_id: string; pessoa_id: string }>;
    const gestante = gestanteRows[0];
    if (!gestante) {
      throw new NotFoundException("gestante_not_found");
    }

    const cpf = input.cpf?.replace(/\D/g, "") || null;
    const cns = input.cns?.replace(/\D/g, "") || null;
    try {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.usuario.update({
          where: { id: gestante.usuario_id },
          data: { cpf, cns },
        });
        await tx.pessoa.update({
          where: { id: gestante.pessoa_id },
          data: {
            nome: input.nomeCompleto.trim(),
            nomeSocial: input.nomeSocial?.trim() || null,
            nomeMae: input.nomeMae.trim(),
            nomePai: input.nomePai.trim(),
            dataNascimento: new Date(`${input.dataNascimento}T00:00:00.000Z`),
            racaCor: input.racaCor.trim(),
            sexo: input.sexo.trim(),
            identidadeGenero: input.identidadeGenero?.trim() || null,
            orientacaoSexual: input.orientacaoSexual?.trim() || null,
            email: input.email?.trim() || null,
            nis: input.nis?.replace(/\D/g, "") || null,
          },
        });
        await tx.gestante.update({
          where: { id: gestante.id },
          data: {
            possuiDeficiencia: input.possuiDeficiencia,
            planoSaudeParticular: input.planoSaudeParticular ?? null,
            alergiasConhecidas: input.alergiasConhecidas ?? null,
            medicamentosEmUso: input.medicamentosEmUso ?? null,
            doencasPreexistentes: input.doencasPreexistentes ?? null,
            cadastroAtualizadoEm: new Date(),
          },
        });
        const enderecoExistente = await tx.endereco.findFirst({
          where: { pessoaId: gestante.pessoa_id },
          select: { id: true },
        });
        if (enderecoExistente) {
          await tx.endereco.update({
            where: { id: enderecoExistente.id },
            data: {
              cep: input.cep.replace(/\D/g, ""),
              municipio: input.municipio.trim(),
              tipoLogradouro: input.tipoLogradouro.trim(),
              logradouro: input.logradouro.trim(),
              bairro: input.bairro.trim(),
              numero: input.numero.trim(),
              complemento: input.complemento?.trim() || null,
              pontoReferencia: input.pontoReferencia?.trim() || null,
            },
          });
        } else {
          await tx.endereco.create({
            data: {
              pessoaId: gestante.pessoa_id,
              cep: input.cep.replace(/\D/g, ""),
              municipio: input.municipio.trim(),
              tipoLogradouro: input.tipoLogradouro.trim(),
              logradouro: input.logradouro.trim(),
              bairro: input.bairro.trim(),
              numero: input.numero.trim(),
              complemento: input.complemento?.trim() || null,
              pontoReferencia: input.pontoReferencia?.trim() || null,
            },
          });
        }
        await tx.gestanteContato.upsert({
          where: { gestanteId: gestante.id },
          create: {
            gestanteId: gestante.id,
            dddCelularPrincipal: input.dddCelularPrincipal?.replace(/\D/g, "") || null,
            celularPrincipal: input.celularPrincipal?.replace(/\D/g, "") || null,
            celularPrincipalWhatsapp: input.celularPrincipalWhatsapp ?? null,
            dddCelularAlternativo: input.dddCelularAlternativo?.replace(/\D/g, "") || null,
            celularAlternativo: input.celularAlternativo?.replace(/\D/g, "") || null,
            celularAlternativoWhatsapp: input.celularAlternativoWhatsapp ?? null,
            dddResidencial: input.dddResidencial?.replace(/\D/g, "") || null,
            telefoneResidencial: input.telefoneResidencial?.replace(/\D/g, "") || null,
          },
          update: {
            dddCelularPrincipal: input.dddCelularPrincipal?.replace(/\D/g, "") || null,
            celularPrincipal: input.celularPrincipal?.replace(/\D/g, "") || null,
            celularPrincipalWhatsapp: input.celularPrincipalWhatsapp ?? null,
            dddCelularAlternativo: input.dddCelularAlternativo?.replace(/\D/g, "") || null,
            celularAlternativo: input.celularAlternativo?.replace(/\D/g, "") || null,
            celularAlternativoWhatsapp: input.celularAlternativoWhatsapp ?? null,
            dddResidencial: input.dddResidencial?.replace(/\D/g, "") || null,
            telefoneResidencial: input.telefoneResidencial?.replace(/\D/g, "") || null,
          },
        });
        await tx.gestanteDeficiencia.deleteMany({ where: { gestanteId: gestante.id } });
        if (input.possuiDeficiencia && input.deficiencias?.length) {
          await tx.gestanteDeficiencia.createMany({
            data: input.deficiencias.map((tipo) => ({ gestanteId: gestante.id, tipo: tipo.trim() })),
          });
        }
        await tx.gestanteProgramaSocial.deleteMany({ where: { gestanteId: gestante.id } });
        await tx.gestanteProgramaSocial.createMany({
          data: input.programasSociais.map((programa) => ({
            gestanteId: gestante.id,
            programaCodigo: programa.trim(),
            programaNome: programa.trim(),
          })),
        });
      });
    } catch (error) {
      if (!this.isLegacySchemaMismatchError(error)) {
        throw error;
      }
      await this.atualizarCadastroLegado(input, {
        gestanteId: gestante.id,
        usuarioId: gestante.usuario_id,
        pessoaId: gestante.pessoa_id,
      });
    }
    return {
      ok: true,
      cadastroId: input.cadastroId,
      mensagem: "Atualizacao cadastral realizada com sucesso",
    };
  }

  async avaliarUnidadePosAtualizacao(cadastroId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT g.id::text, gv.ubs_id::text
      FROM gestante g
      LEFT JOIN gestante_vinculo gv ON gv.gestante_id = g.id
      WHERE g.id = $1::uuid
      LIMIT 1
      `,
      cadastroId,
    )) as Array<{ id: string; ubs_id: string | null }>;
    const gestante = rows[0];
    if (!gestante) {
      throw new NotFoundException("gestante_not_found");
    }
    let opcoesProximas: Array<{ nome: string; distanciaKm: string; origem: "cdi" | "proxima" }> = [];
    try {
      const mensagemOrientacao = await this.confirmarOrientacao({ cadastroId });
      opcoesProximas = this.parseOpcoesEscolhaDaMensagem(mensagemOrientacao.mensagem);
    } catch {
      opcoesProximas = await this.listarOpcoesUnidadeFallback();
    }

    if (opcoesProximas.length === 0) {
      opcoesProximas = await this.listarOpcoesUnidadeFallback();
    }

    if (gestante.ubs_id) {
      const ubsAtual = await this.prisma.ubs.findUnique({
        where: { id: gestante.ubs_id },
        select: { nome: true },
      });
      const unidadeAtualNome = ubsAtual?.nome ?? undefined;
      const opcoes = unidadeAtualNome
        ? this.adicionarOpcaoCdiSeAusente(opcoesProximas, unidadeAtualNome)
        : opcoesProximas;
      return {
        cenario: "manter_ou_alterar_unidade",
        mensagem:
          "Deseja permanecer na unidade atual ou selecionar uma das unidades mais proximas do seu endereco?",
        unidadeAtualNome,
        opcoes,
      };
    }
    return {
      cenario: "escolher_unidade",
      mensagem: "Selecione uma das unidades mais proximas do seu endereco para acompanhamento pre-natal.",
      opcoes: opcoesProximas,
    };
  }

  async confirmarEscolhaUnidadePosAtualizacao(input: ConfirmarEscolhaUnidadePosAtualizacaoInput) {
    const payload = await this.escolherUnidade({
      cadastroId: input.cadastroId,
      nomeUnidade: input.nomeUnidade,
      origem: input.origem,
    });
    return { sucesso: payload.sucesso, unidadeNome: payload.unidadeNome };
  }

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
    const origemCadastro = this.normalizarOrigemCadastro(input.origemCadastro);

    try {
      return await this.prisma.$transaction(async (tx: any) => {
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
            origemCadastro,
            status: "pendente",
          },
        });

        await this.persistirDadosComplementaresCadastro(tx, {
          input,
          gestanteId: gestante.id,
          pessoaId: pessoa.id,
          usuarioId: usuario.id,
        });

        return { ok: true, id: gestante.id };
      });
    } catch (error) {
      if (!this.isLegacySchemaMismatchError(error)) {
        throw error;
      }

      return this.prisma.$transaction(async (tx: any) => {
        const usuarioId = randomUUID();
        const pessoaId = randomUUID();
        const gestanteId = randomUUID();

        await tx.$executeRawUnsafe(
          `INSERT INTO usuario (id, tipo, cpf, cns, senha_hash, status)
           VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text)`,
          usuarioId,
          "gestante",
          cpf || null,
          cns || null,
          senhaHash,
          "ativo",
        );

        await tx.$executeRawUnsafe(
          `INSERT INTO pessoa (id, nome_completo)
           VALUES ($1::uuid, $2::text)`,
          pessoaId,
          input.nome,
        );

        await tx.$executeRawUnsafe(
          `INSERT INTO gestante (id, usuario_id, pessoa_id, origem_cadastro, status)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text)`,
          gestanteId,
          usuarioId,
          pessoaId,
          origemCadastro,
          "pendente",
        );

        await this.persistirDadosComplementaresCadastro(tx, {
          input,
          gestanteId,
          pessoaId,
          usuarioId,
        });

        return { ok: true, id: gestanteId };
      });
    }
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
    await this.prisma.$transaction(async (tx: any) => {
      await tx.usuario.update({
        where: { id: sessao.usuarioId },
        data: { senhaHash },
      });
    });
    this.resetTokens.delete(input.token);

    return { ok: true };
  }

  async escolherUnidade(input: EscolherUnidadeInput) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT g.id::text FROM gestante g WHERE g.id = $1::uuid LIMIT 1`,
      input.cadastroId,
    )) as Array<{ id: string }>;
    const gestante = rows[0];
    if (!gestante) throw new NotFoundException("gestante_not_found");

    const unidade = await this.unidadeService.resolverPorNome(input.nomeUnidade);
    await this.prisma.$transaction(async (tx: any) => {
      await tx.gestanteVinculo.upsert({
        where: { gestanteId: gestante.id },
        update: { ubsId: unidade.id },
        create: { gestanteId: gestante.id, ubsId: unidade.id },
      });

      await tx.$executeRawUnsafe(
        `
        INSERT INTO gestante_unidade_escolha (
          gestante_id,
          ubs_id,
          unidade_escolhida_nome,
          unidade_escolhida_origem
        ) VALUES (
          $1::uuid,
          $2::uuid,
          $3::text,
          $4::text
        )
        `,
        gestante.id,
        unidade.id,
        input.nomeUnidade,
        input.origem,
      );
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
      const rows = (await this.prisma.$queryRawUnsafe(
        `
        SELECT g.id::text, u.cns::text, u.cpf::text
        FROM gestante g
        INNER JOIN usuario u ON u.id = g.usuario_id
        WHERE g.id = $1::uuid
        LIMIT 1
        `,
        input.cadastroId,
      )) as Array<{ id: string; cns: string | null; cpf: string | null }>;
      const gestante = rows[0];
      if (!gestante) throw new NotFoundException("gestante_not_found");

      cns = gestante.cns ?? undefined;
      if (!cns && gestante.cpf) {
        const cnsResolve = await this.integracaoService.buscarCns(gestante.cpf);
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

  private validarAtualizacaoCadastral(input: AtualizarCadastroGestanteInput): void {
    this.validarIdadePermitida(input.dataNascimento);
    this.validarNomePermitido(input.nomeCompleto, "invalid_nome_completo");
    if (input.nomeSocial) this.validarNomePermitido(input.nomeSocial, "invalid_nome_social");
    this.validarNomePermitido(input.nomeMae, "invalid_nome_mae");
    this.validarNomePermitido(input.nomePai, "invalid_nome_pai");
    if (input.complemento) this.validarTextoEndereco(input.complemento, "invalid_complemento");
    if (input.pontoReferencia) this.validarTextoEndereco(input.pontoReferencia, "invalid_ponto_referencia");
    this.validarTelefone(input.dddCelularPrincipal, input.celularPrincipal, "invalid_celular_principal");
    this.validarTelefone(input.dddCelularAlternativo, input.celularAlternativo, "invalid_celular_alternativo");
    this.validarResidencial(input.dddResidencial, input.telefoneResidencial);
    if (input.possuiDeficiencia && (!input.deficiencias || input.deficiencias.length === 0)) {
      throw new BadRequestException("deficiencia_required");
    }
    if (input.programasSociais.length === 0) {
      throw new BadRequestException("programa_social_required");
    }
    const hasNenhum = input.programasSociais.includes("Nenhum");
    if (hasNenhum && input.programasSociais.length > 1) {
      throw new BadRequestException("programa_social_nenhum_conflict");
    }
    if (input.programasSociais.includes("Bolsa Familia") && !input.nis) {
      throw new BadRequestException("nis_required");
    }
  }

  private validarIdadePermitida(dataNascimento: string): void {
    const nascimento = new Date(`${dataNascimento}T00:00:00.000Z`);
    if (Number.isNaN(nascimento.getTime())) {
      throw new BadRequestException("invalid_data_nascimento");
    }
    const hoje = new Date();
    let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
    const mes = hoje.getUTCMonth() - nascimento.getUTCMonth();
    if (mes < 0 || (mes === 0 && hoje.getUTCDate() < nascimento.getUTCDate())) {
      idade -= 1;
    }
    if (idade < 9 || idade > 60) {
      throw new BadRequestException("invalid_idade_permitida");
    }
  }

  private validarNomePermitido(value: string, code: string): void {
    if (/\s{2,}/.test(value)) {
      throw new BadRequestException(code);
    }
    const regex = /^[A-Za-zÀ-ÖØ-öø-ÿ' ]{1,70}$/u;
    if (!regex.test(value.trim())) {
      throw new BadRequestException(code);
    }
  }

  private validarTextoEndereco(value: string, code: string): void {
    if (/\s{2,}/.test(value)) {
      throw new BadRequestException(code);
    }
    const regex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9'(),/\- ]{1,50}$/u;
    if (!regex.test(value.trim())) {
      throw new BadRequestException(code);
    }
  }

  private validarTelefone(ddd?: string, telefone?: string, code?: string): void {
    const cleanedDdd = ddd?.replace(/\D/g, "");
    const cleanedPhone = telefone?.replace(/\D/g, "");
    if (!cleanedDdd && !cleanedPhone) {
      return;
    }
    if (!cleanedDdd || !this.isDddValido(cleanedDdd) || !cleanedPhone || !/^9\d{8}$/.test(cleanedPhone)) {
      throw new BadRequestException(code ?? "invalid_telefone");
    }
  }

  private validarResidencial(ddd?: string, telefone?: string): void {
    const cleanedDdd = ddd?.replace(/\D/g, "");
    const cleanedPhone = telefone?.replace(/\D/g, "");
    if (!cleanedDdd && !cleanedPhone) {
      return;
    }
    if (!cleanedDdd || !this.isDddValido(cleanedDdd) || !cleanedPhone || !/^[2-5]\d{7}$/.test(cleanedPhone)) {
      throw new BadRequestException("invalid_telefone_residencial");
    }
  }

  private isDddValido(ddd: string): boolean {
    return new Set([
      "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", "27", "28",
      "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", "44", "45", "46", "47",
      "48", "49", "51", "53", "54", "55", "61", "62", "63", "64", "65", "66", "67", "68",
      "69", "71", "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86", "87",
      "88", "89", "91", "92", "93", "94", "95", "96", "97", "98", "99",
    ]).has(ddd);
  }

  private parseOpcoesEscolhaDaMensagem(
    mensagem: string,
  ): Array<{ nome: string; distanciaKm: string; origem: "cdi" | "proxima" }> {
    const texto = mensagem.trim();
    const opcoes: Array<{ nome: string; distanciaKm: string; origem: "cdi" | "proxima" }> = [];
    const markerRegex = /as\s+(?:5\s+)?unidades\s+mais\s+pr[oó]ximas\s+s[aã]o:\s*/i;
    const markerMatch = markerRegex.exec(texto);
    if (markerMatch) {
      const listaRaw = texto.slice(markerMatch.index + markerMatch[0].length).trim();
      const itemRegex = /\s*([^,]+?)(?:\s*\(([\d.,]+)\s*km\))?\s*(?:,|$)/gi;
      let match: RegExpExecArray | null = itemRegex.exec(listaRaw);
      while (match) {
        const nome = (match[1] ?? "").trim();
        const distanciaKm = (match[2] ?? "").trim();
        if (nome) {
          opcoes.push({
            nome,
            distanciaKm: distanciaKm || "",
            origem: "proxima",
          });
        }
        match = itemRegex.exec(listaRaw);
      }
    }

    const cdiMatch = texto.match(
      /Deseja realizar seu acompanhamento pr[ée]-natal na unidade\s+(.+?)\s+que est[áa]\s+vinculada/i,
    );
    if (cdiMatch?.[1]) {
      const nome = cdiMatch[1].trim();
      if (nome) {
        opcoes.unshift({
          nome,
          distanciaKm: "",
          origem: "cdi",
        });
      }
    }

    return opcoes;
  }

  private adicionarOpcaoCdiSeAusente(
    opcoes: Array<{ nome: string; distanciaKm: string; origem: "cdi" | "proxima" }>,
    unidadeAtualNome: string,
  ): Array<{ nome: string; distanciaKm: string; origem: "cdi" | "proxima" }> {
    const normalizedAtual = unidadeAtualNome.trim().toLowerCase();
    const exists = opcoes.some((item) => item.nome.trim().toLowerCase() === normalizedAtual);
    if (exists) return opcoes;
    return [{ nome: unidadeAtualNome, distanciaKm: "", origem: "cdi" }, ...opcoes];
  }

  private async listarOpcoesUnidadeFallback(): Promise<
    Array<{ nome: string; distanciaKm: string; origem: "proxima" }>
  > {
    const ubs = await this.prisma.ubs.findMany({
      orderBy: { nome: "asc" },
      take: 5,
      select: { nome: true },
    });
    return ubs.map((item: { nome: string }) => ({
      nome: item.nome,
      distanciaKm: "",
      origem: "proxima",
    }));
  }

  private isLegacySchemaMismatchError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return (
      message.includes("does not exist in the current database") ||
      message.includes("column") ||
      message.includes("relation")
    );
  }

  private normalizarOrigemCadastro(origem: string): string {
    const value = origem.trim().toLowerCase();
    if (value === "manual" || value === "cip") {
      return value;
    }
    if (value === "portal") {
      return "manual";
    }
    throw new BadRequestException("invalid_origem_cadastro");
  }

  private async persistirDadosComplementaresCadastro(
    tx: {
      $queryRawUnsafe: (query: string, ...params: unknown[]) => Promise<Array<Record<string, unknown>>>;
      $executeRawUnsafe: (query: string, ...params: unknown[]) => Promise<number>;
    },
    payload: { input: CadastrarGestanteInput; gestanteId: string; pessoaId: string; usuarioId: string },
  ): Promise<void> {
    const { input, gestanteId, pessoaId, usuarioId } = payload;

    const deficienciaTexto =
      input.possuiDeficiencia && input.deficienciaTipos?.length
        ? input.deficienciaTipos.map((item: string) => item.trim()).filter(Boolean).join(", ")
        : null;

    const sexo = input.sexo?.trim().toUpperCase() || null;
    const racaCor = input.racaCor?.trim().toUpperCase() || null;
    const nomeSocial = input.nomeSocial?.trim() || null;
    const nomeMae = input.nomeMae?.trim() || null;
    const nomePai = input.nomePai?.trim() || null;
    const dataNascimento = input.dataNascimento?.trim() || null;
    const identidadeGeneroCodigo = input.identidadeGenero?.trim() || null;
    const orientacaoSexualCodigo = input.orientacaoSexual?.trim() || null;
    const email = input.email?.trim() || null;

    await tx.$executeRawUnsafe(
      `
      UPDATE pessoa p
      SET
        nome_social = COALESCE($2::text, p.nome_social),
        nome_social_principal = COALESCE($3::boolean, p.nome_social_principal),
        nome_mae = COALESCE($4::text, p.nome_mae),
        nome_pai = COALESCE($5::text, p.nome_pai),
        data_nascimento = COALESCE($6::date, p.data_nascimento),
        sexo = COALESCE($7::text, p.sexo),
        raca_cor = COALESCE($8::text, p.raca_cor),
        possui_deficiencia = COALESCE($9::boolean, p.possui_deficiencia),
        deficiencia = CASE WHEN $10::text IS NULL THEN p.deficiencia ELSE $10::text END,
        identidade_genero_id = COALESCE(
          (SELECT ig.id FROM identidade_genero ig WHERE ig.codigo = $11::text LIMIT 1),
          p.identidade_genero_id
        ),
        orientacao_sexual_id = COALESCE(
          (SELECT os.id FROM orientacao_sexual os WHERE os.codigo = $12::text LIMIT 1),
          p.orientacao_sexual_id
        ),
        atualizado_em = now()
      WHERE p.id = $1::uuid
      `,
      pessoaId,
      nomeSocial,
      input.nomeSocialPrincipal ?? null,
      nomeMae,
      nomePai,
      dataNascimento,
      sexo,
      racaCor,
      input.possuiDeficiencia ?? null,
      deficienciaTexto,
      identidadeGeneroCodigo,
      orientacaoSexualCodigo,
    );

    if (email) {
      await tx.$executeRawUnsafe(
        `
        UPDATE usuario u
        SET email = $2::text
        WHERE u.id = $1::uuid
        `,
        usuarioId,
        email,
      );
    }

    if (input.cep || input.logradouro || input.numero || input.bairro) {
      const enderecoRows = await tx.$queryRawUnsafe(
        `
        SELECT e.id::text AS id
        FROM endereco e
        WHERE e.pessoa_id = $1::uuid
        ORDER BY e.atualizado_em DESC NULLS LAST, e.criado_em DESC NULLS LAST
        LIMIT 1
        `,
        pessoaId,
      );
      const enderecoId = String(enderecoRows[0]?.id ?? randomUUID());
      if (enderecoRows.length > 0) {
        await tx.$executeRawUnsafe(
          `
          UPDATE endereco e
          SET
            cep = COALESCE($2::text, e.cep),
            tipo_logradouro = COALESCE($3::text, e.tipo_logradouro),
            logradouro = COALESCE($4::text, e.logradouro),
            numero = COALESCE($5::text, e.numero),
            complemento = CASE WHEN $6::text IS NULL THEN e.complemento ELSE $6::text END,
            bairro = COALESCE($7::text, e.bairro),
            municipio = COALESCE($8::text, e.municipio),
            ponto_referencia = CASE WHEN $9::text IS NULL THEN e.ponto_referencia ELSE $9::text END,
            distrito_sanitario_id = CASE WHEN $10::uuid IS NULL THEN e.distrito_sanitario_id ELSE $10::uuid END,
            atualizado_em = now()
          WHERE e.id = $1::uuid
          `,
          enderecoId,
          input.cep?.trim() || null,
          input.tipoLogradouro?.trim() || null,
          input.logradouro?.trim() || null,
          input.numero?.trim() || null,
          input.complemento?.trim() || null,
          input.bairro?.trim() || null,
          input.municipio?.trim() || null,
          input.pontoReferencia?.trim() || null,
          input.distritoId || null,
        );
      } else {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO endereco (
            id, pessoa_id, cep, tipo_logradouro, logradouro, numero, complemento, bairro, municipio, ponto_referencia, distrito_sanitario_id
          ) VALUES (
            $1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text, $9::text, $10::text, $11::uuid
          )
          `,
          enderecoId,
          pessoaId,
          input.cep?.trim() || "",
          input.tipoLogradouro?.trim() || null,
          input.logradouro?.trim() || "",
          input.numero?.trim() || "",
          input.complemento?.trim() || null,
          input.bairro?.trim() || "",
          input.municipio?.trim() || null,
          input.pontoReferencia?.trim() || null,
          input.distritoId || null,
        );
      }
    }

    await tx.$executeRawUnsafe(`DELETE FROM contato WHERE pessoa_id = $1::uuid`, pessoaId);
    const contatos = this.mapearContatosCadastro(input);
    for (const contato of contatos) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO contato (id, pessoa_id, tipo, valor, whatsapp, principal)
        VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::boolean, $6::boolean)
        `,
        randomUUID(),
        pessoaId,
        contato.tipo,
        contato.valor,
        contato.whatsapp,
        contato.principal,
      );
    }

    const descobrimentoCodigo = input.descobrimento?.trim() || null;
    const planoSaudeCodigo = input.planoSaude?.trim() || null;
    const descobrimentoRows = descobrimentoCodigo
      ? await tx.$queryRawUnsafe(
          `SELECT dg.id::text AS id FROM descobrimento_gestacao dg WHERE dg.codigo = $1::text LIMIT 1`,
          descobrimentoCodigo,
        )
      : [];
    const planoRows = planoSaudeCodigo
      ? await tx.$queryRawUnsafe(
          `SELECT pso.id::text AS id FROM plano_saude_opcao pso WHERE pso.codigo = $1::text LIMIT 1`,
          planoSaudeCodigo,
        )
      : [];
    const descobrimentoId = descobrimentoRows[0]?.id ? String(descobrimentoRows[0].id) : null;
    const planoId = planoRows[0]?.id ? String(planoRows[0].id) : null;

    if (descobrimentoId) {
      const clinicoRows = await tx.$queryRawUnsafe(
        `SELECT gc.gestante_id::text AS id FROM gestante_clinico gc WHERE gc.gestante_id = $1::uuid LIMIT 1`,
        gestanteId,
      );
      if (clinicoRows.length > 0) {
        await tx.$executeRawUnsafe(
          `
          UPDATE gestante_clinico gc
          SET
            descobrimento_gestacao_id = COALESCE($2::uuid, gc.descobrimento_gestacao_id),
            dum = COALESCE($3::date, gc.dum),
            plano_saude_id = CASE WHEN $4::uuid IS NULL THEN gc.plano_saude_id ELSE $4::uuid END,
            manter_acompanhamento_ubs = CASE WHEN $5::text IS NULL THEN gc.manter_acompanhamento_ubs ELSE $5::text END,
            gestacoes_previas = CASE WHEN $6::smallint IS NULL THEN gc.gestacoes_previas ELSE $6::smallint END,
            partos_normal = CASE WHEN $7::smallint IS NULL THEN gc.partos_normal ELSE $7::smallint END,
            partos_cesareo = CASE WHEN $8::smallint IS NULL THEN gc.partos_cesareo ELSE $8::smallint END,
            abortos = CASE WHEN $9::smallint IS NULL THEN gc.abortos ELSE $9::smallint END,
            alergias = CASE WHEN $10::text IS NULL THEN gc.alergias ELSE $10::text END,
            doencas_conhecidas = CASE WHEN $11::text IS NULL THEN gc.doencas_conhecidas ELSE $11::text END,
            medicacoes_em_uso = CASE WHEN $12::text IS NULL THEN gc.medicacoes_em_uso ELSE $12::text END,
            atualizado_em = now()
          WHERE gc.gestante_id = $1::uuid
          `,
          gestanteId,
          descobrimentoId,
          input.dum?.trim() || null,
          planoId,
          input.manterAcompanhamentoUbs?.trim() || null,
          this.parseSmallInt(input.gestacoesPrevias),
          this.parseSmallInt(input.partosNormal),
          this.parseSmallInt(input.partosCesareo),
          this.parseSmallInt(input.abortos),
          this.normalizeFlagText(input.alergias),
          this.normalizeFlagText(input.doencasConhecidas),
          this.normalizeFlagText(input.medicacoesEmUso),
        );
      } else {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO gestante_clinico (
            gestante_id, descobrimento_gestacao_id, dum, plano_saude_id, manter_acompanhamento_ubs,
            gestacoes_previas, partos_normal, partos_cesareo, abortos,
            alergias, doencas_conhecidas, medicacoes_em_uso
          ) VALUES (
            $1::uuid, $2::uuid, $3::date, $4::uuid, $5::text,
            $6::smallint, $7::smallint, $8::smallint, $9::smallint,
            $10::text, $11::text, $12::text
          )
          `,
          gestanteId,
          descobrimentoId,
          input.dum?.trim() || null,
          planoId,
          input.manterAcompanhamentoUbs?.trim() || null,
          this.parseSmallInt(input.gestacoesPrevias),
          this.parseSmallInt(input.partosNormal),
          this.parseSmallInt(input.partosCesareo),
          this.parseSmallInt(input.abortos),
          this.normalizeFlagText(input.alergias),
          this.normalizeFlagText(input.doencasConhecidas),
          this.normalizeFlagText(input.medicacoesEmUso),
        );
      }
    }

    await tx.$executeRawUnsafe(`DELETE FROM gestante_programa_social WHERE gestante_id = $1::uuid`, gestanteId);
    for (const codigo of input.programaSocial ?? []) {
      const cleanCodigo = codigo.trim();
      if (!cleanCodigo || cleanCodigo === "nenhum") continue;
      await tx.$executeRawUnsafe(
        `
        INSERT INTO gestante_programa_social (gestante_id, programa_social_id, nis)
        SELECT $1::uuid, ps.id, $3::text
        FROM programa_social ps
        WHERE ps.codigo = $2::text
        `,
        gestanteId,
        cleanCodigo,
        input.nis?.trim() || null,
      );
    }
  }

  private mapearContatosCadastro(input: CadastrarGestanteInput): Array<{
    tipo: "telefone_celular" | "telefone_residencial" | "email";
    valor: string;
    whatsapp: boolean;
    principal: boolean;
  }> {
    const contatos: Array<{
      tipo: "telefone_celular" | "telefone_residencial" | "email";
      valor: string;
      whatsapp: boolean;
      principal: boolean;
    }> = [];
    const celPrincipal = `${(input.ddd ?? "").replace(/\D/g, "")}${(input.celularPrincipal ?? "").replace(/\D/g, "")}`;
    if (celPrincipal) {
      contatos.push({ tipo: "telefone_celular", valor: celPrincipal, whatsapp: Boolean(input.temWhatsapp), principal: true });
    }
    const celAlternativo = `${(input.dddAlternativo ?? "").replace(/\D/g, "")}${(input.celularAlternativo ?? "").replace(/\D/g, "")}`;
    if (celAlternativo) {
      contatos.push({ tipo: "telefone_celular", valor: celAlternativo, whatsapp: Boolean(input.temWhatsappAlternativo), principal: false });
    }
    const residencial = `${(input.dddResidencial ?? "").replace(/\D/g, "")}${(input.telefoneResidencial ?? "").replace(/\D/g, "")}`;
    if (residencial) {
      contatos.push({ tipo: "telefone_residencial", valor: residencial, whatsapp: false, principal: false });
    }
    const email = input.email?.trim();
    if (email) {
      contatos.push({ tipo: "email", valor: email, whatsapp: false, principal: false });
    }
    return contatos;
  }

  private parseSmallInt(value?: string): number | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    if (!digits) return null;
    const num = Number.parseInt(digits, 10);
    return Number.isNaN(num) ? null : num;
  }

  private normalizeFlagText(value?: string): string | null {
    if (!value) return null;
    const txt = value.trim().toLowerCase();
    if (txt === "sim") return "sim";
    if (txt === "nao") return "nao";
    return null;
  }

  private async atualizarCadastroLegado(
    input: AtualizarCadastroGestanteInput,
    ids: { gestanteId: string; usuarioId: string; pessoaId: string },
  ): Promise<void> {
    const cpf = input.cpf?.replace(/\D/g, "") || null;
    const cns = input.cns?.replace(/\D/g, "") || null;
    const deficienciaTexto =
      input.possuiDeficiencia && input.deficiencias?.length
        ? input.deficiencias.map((item: string) => item.trim()).filter(Boolean).join(", ")
        : null;
    const identidadeCodigo = this.normalizeCatalogCode(input.identidadeGenero);
    const orientacaoCodigo = this.normalizeCatalogCode(input.orientacaoSexual);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(
        `
        UPDATE usuario u
        SET cpf = $2::text, cns = $3::text, email = $4::text
        WHERE u.id = $1::uuid
        `,
        ids.usuarioId,
        cpf,
        cns,
        input.email?.trim() || null,
      );

      await tx.$executeRawUnsafe(
        `
        UPDATE pessoa p
        SET
          nome_completo = $2::text,
          nome_social = $3::text,
          nome_mae = $4::text,
          nome_pai = $5::text,
          data_nascimento = $6::date,
          raca_cor = $7::text,
          sexo = $8::text,
          possui_deficiencia = $9::boolean,
          deficiencia = $10::text,
          identidade_genero_id = (
            SELECT ig.id FROM identidade_genero ig WHERE ig.codigo = $11::text LIMIT 1
          ),
          orientacao_sexual_id = (
            SELECT os.id FROM orientacao_sexual os WHERE os.codigo = $12::text LIMIT 1
          ),
          atualizado_em = now()
        WHERE p.id = $1::uuid
        `,
        ids.pessoaId,
        input.nomeCompleto.trim(),
        input.nomeSocial?.trim() || null,
        input.nomeMae.trim(),
        input.nomePai.trim(),
        input.dataNascimento,
        input.racaCor.trim(),
        input.sexo.trim(),
        input.possuiDeficiencia,
        deficienciaTexto,
        identidadeCodigo,
        orientacaoCodigo,
      );

      const enderecoRows = (await tx.$queryRawUnsafe(
        `SELECT e.id::text AS id FROM endereco e WHERE e.pessoa_id = $1::uuid ORDER BY e.atualizado_em DESC NULLS LAST, e.criado_em DESC NULLS LAST LIMIT 1`,
        ids.pessoaId,
      )) as Array<{ id: string }>;
      const enderecoId = enderecoRows[0]?.id;
      if (enderecoId) {
        await tx.$executeRawUnsafe(
          `
          UPDATE endereco e
          SET
            cep = $2::text,
            municipio = $3::text,
            tipo_logradouro = $4::text,
            logradouro = $5::text,
            bairro = $6::text,
            numero = $7::text,
            complemento = $8::text,
            ponto_referencia = $9::text,
            atualizado_em = now()
          WHERE e.id = $1::uuid
          `,
          enderecoId,
          input.cep.replace(/\D/g, ""),
          input.municipio.trim(),
          input.tipoLogradouro.trim(),
          input.logradouro.trim(),
          input.bairro.trim(),
          input.numero.trim(),
          input.complemento?.trim() || null,
          input.pontoReferencia?.trim() || null,
        );
      } else {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO endereco (id, pessoa_id, cep, municipio, tipo_logradouro, logradouro, bairro, numero, complemento, ponto_referencia)
          VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text, $9::text, $10::text)
          `,
          randomUUID(),
          ids.pessoaId,
          input.cep.replace(/\D/g, ""),
          input.municipio.trim(),
          input.tipoLogradouro.trim(),
          input.logradouro.trim(),
          input.bairro.trim(),
          input.numero.trim(),
          input.complemento?.trim() || null,
          input.pontoReferencia?.trim() || null,
        );
      }

      await tx.$executeRawUnsafe(`DELETE FROM contato WHERE pessoa_id = $1::uuid`, ids.pessoaId);
      const contatos = this.mapearContatosAtualizacao(input);
      for (const contato of contatos) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO contato (id, pessoa_id, tipo, valor, whatsapp, principal)
          VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::boolean, $6::boolean)
          `,
          randomUUID(),
          ids.pessoaId,
          contato.tipo,
          contato.valor,
          contato.whatsapp,
          contato.principal,
        );
      }

      const planoSaudeCodigo =
        input.planoSaudeParticular == null
          ? null
          : input.planoSaudeParticular
            ? "sim"
            : "nao";
      const planoRows = planoSaudeCodigo
        ? ((await tx.$queryRawUnsafe(
            `SELECT pso.id::text AS id FROM plano_saude_opcao pso WHERE pso.codigo = $1::text LIMIT 1`,
            planoSaudeCodigo,
          )) as Array<{ id: string }>)
        : [];
      const planoId = planoRows[0]?.id ?? null;
      const clinicoRows = (await tx.$queryRawUnsafe(
        `SELECT gc.gestante_id::text FROM gestante_clinico gc WHERE gc.gestante_id = $1::uuid LIMIT 1`,
        ids.gestanteId,
      )) as Array<{ gestante_id: string }>;
      if (clinicoRows.length > 0) {
        await tx.$executeRawUnsafe(
          `
          UPDATE gestante_clinico gc
          SET
            plano_saude_id = CASE WHEN $2::uuid IS NULL THEN gc.plano_saude_id ELSE $2::uuid END,
            alergias = CASE WHEN $3::text IS NULL THEN gc.alergias ELSE $3::text END,
            doencas_conhecidas = CASE WHEN $4::text IS NULL THEN gc.doencas_conhecidas ELSE $4::text END,
            medicacoes_em_uso = CASE WHEN $5::text IS NULL THEN gc.medicacoes_em_uso ELSE $5::text END,
            atualizado_em = now()
          WHERE gc.gestante_id = $1::uuid
          `,
          ids.gestanteId,
          planoId,
          this.normalizeFlagText(input.alergiasConhecidas == null ? undefined : input.alergiasConhecidas ? "sim" : "nao"),
          this.normalizeFlagText(input.doencasPreexistentes == null ? undefined : input.doencasPreexistentes ? "sim" : "nao"),
          this.normalizeFlagText(input.medicamentosEmUso == null ? undefined : input.medicamentosEmUso ? "sim" : "nao"),
        );
      }

      await tx.$executeRawUnsafe(`DELETE FROM gestante_programa_social WHERE gestante_id = $1::uuid`, ids.gestanteId);
      for (const codigo of input.programasSociais) {
        const cleanCodigo = codigo.trim();
        if (!cleanCodigo || cleanCodigo === "nenhum") continue;
        await tx.$executeRawUnsafe(
          `
          INSERT INTO gestante_programa_social (gestante_id, programa_social_id, nis)
          SELECT $1::uuid, ps.id, $3::text
          FROM programa_social ps
          WHERE ps.codigo = $2::text
          `,
          ids.gestanteId,
          cleanCodigo,
          input.nis?.replace(/\D/g, "") || null,
        );
      }
    });
  }

  private mapearContatosAtualizacao(input: AtualizarCadastroGestanteInput): Array<{
    tipo: "telefone_celular" | "telefone_residencial" | "email";
    valor: string;
    whatsapp: boolean;
    principal: boolean;
  }> {
    const contatos: Array<{
      tipo: "telefone_celular" | "telefone_residencial" | "email";
      valor: string;
      whatsapp: boolean;
      principal: boolean;
    }> = [];
    const celularPrincipal = `${(input.dddCelularPrincipal ?? "").replace(/\D/g, "")}${(input.celularPrincipal ?? "").replace(/\D/g, "")}`;
    if (celularPrincipal) {
      contatos.push({
        tipo: "telefone_celular",
        valor: celularPrincipal,
        whatsapp: Boolean(input.celularPrincipalWhatsapp),
        principal: true,
      });
    }
    const celularAlternativo = `${(input.dddCelularAlternativo ?? "").replace(/\D/g, "")}${(input.celularAlternativo ?? "").replace(/\D/g, "")}`;
    if (celularAlternativo) {
      contatos.push({
        tipo: "telefone_celular",
        valor: celularAlternativo,
        whatsapp: Boolean(input.celularAlternativoWhatsapp),
        principal: false,
      });
    }
    const residencial = `${(input.dddResidencial ?? "").replace(/\D/g, "")}${(input.telefoneResidencial ?? "").replace(/\D/g, "")}`;
    if (residencial) {
      contatos.push({
        tipo: "telefone_residencial",
        valor: residencial,
        whatsapp: false,
        principal: false,
      });
    }
    const email = input.email?.trim();
    if (email) {
      contatos.push({
        tipo: "email",
        valor: email,
        whatsapp: false,
        principal: false,
      });
    }
    return contatos;
  }

  private normalizeCatalogCode(value?: string): string | null {
    if (!value?.trim()) return null;
    return value.trim().toLowerCase().replace(/_/g, "-");
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
      select: {
        id: true,
        gestante: {
          select: {
            pessoa: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
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
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT tentativas, bloqueado_ate
       FROM gestante_esqueceu_senha_tentativas
       WHERE cpf_cns = $1
       LIMIT 1`,
      cpfCns,
    )) as Array<{ tentativas: number; bloqueado_ate: Date | null }>;
    const row = rows[0];
    if (!row) return null;
    return { tentativas: Number(row.tentativas ?? 0), bloqueadoAte: row.bloqueado_ate ?? null };
  }

}
