import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EsusAdapter } from "../../../cloud/adapters/EsusAdapter";
import { OrientacaoMaeSalvadorRaw } from "../../../cloud/adapters/EsusAdapter.types";
import { SoapCnsAdapter } from "../../../cloud/adapters/SoapCnsAdapter";
import { OrientacaoMaeSalvadorPayload } from "../../gestante/graphql/objects/OrientacaoMaeSalvadorPayload";

const SITUACOES_QUE_EXIGEM_ESCOLHA = new Set([
  "CDI_OUTRO_DISTRITO",
  "SEM_CDI",
  "FORA_SALVADOR",
]);

@Injectable()
export class IntegracaoService {
  private readonly logger = new Logger(IntegracaoService.name);

  constructor(
    private readonly esusAdapter: EsusAdapter,
    private readonly soapCnsAdapter: SoapCnsAdapter,
  ) {}

  async buscarCep(cep: string) {
    const endereco = await this.esusAdapter.buscarCep(cep);
    if (!endereco) {
      throw new NotFoundException("cep_not_found");
    }
    return endereco;
  }

  async buscarCns(documento: string) {
    const fontesIndisponiveis: string[] = [];
    try {
      const esus = await this.esusAdapter.buscarCnsPorDocumento(documento);
      if (esus) return { sucesso: true, fonte: "esus", cidadao: esus, fontesIndisponiveis };
    } catch {
      fontesIndisponiveis.push("esus");
    }

    try {
      const fallback = await this.soapCnsAdapter.buscarCnsFallback(documento);
      if (fallback) return { sucesso: true, fonte: "soap", cidadao: fallback, fontesIndisponiveis };
      this.logger.warn(`SOAP sem resultado para documento=${documento.replace(/\D/g, "")}`);
    } catch {
      fontesIndisponiveis.push("soap");
    }

    const fallbackDireto = await this.buscarCnsSoapDireto(documento);
    if (fallbackDireto) {
      return { sucesso: true, fonte: "soap", cidadao: fallbackDireto, fontesIndisponiveis };
    }

    return { sucesso: false, fontesIndisponiveis };
  }

  async orientarMaeSalvador(
    cns: string,
    fallback?: { bairro?: string | null; municipio?: string | null },
  ): Promise<OrientacaoMaeSalvadorPayload> {
    let base: OrientacaoMaeSalvadorPayload;
    try {
      const raw = await this.esusAdapter.orientarMaeSalvador(cns);
      base = raw ? this.mapearOrientacao(raw) : this.payloadIndeterminado();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao orientar Mae Salvador: ${message}`);
      base = this.payloadIndeterminado();
    }
    return this.aplicarFallbackPorBairro(base, fallback);
  }

  /**
   * Quando a fn_orientacao_mae_salvador_v2 nao consegue determinar o distrito
   * (paciente novo, sem cadastro em tb_cidadao/e-SUS), usamos o bairro/municipio
   * informados pelo proprio cadastro (app DB) para listar unidades elegiveis.
   * Mantemos o resto do payload (situacao clinica, unidade de acompanhamento etc).
   */
  private async aplicarFallbackPorBairro(
    base: OrientacaoMaeSalvadorPayload,
    fallback?: { bairro?: string | null; municipio?: string | null },
  ): Promise<OrientacaoMaeSalvadorPayload> {
    if (base.unidadesElegiveis.length > 0) return base;
    const bairro = (fallback?.bairro ?? "").trim();
    if (!bairro) return base;

    const municipioNorm = (fallback?.municipio ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const isSalvador = municipioNorm === "salvador" || municipioNorm.includes("salvador");

    try {
      const result = await this.esusAdapter.listarUnidadesPorBairro(bairro, isSalvador);
      if (result.unidades.length === 0) {
        return base;
      }
      const unidadesElegiveis = result.unidades.map((u) => ({
        nome: u.nome,
        ...(u.cnes ? { cnes: u.cnes } : {}),
        ...(u.distrito ? { distrito: u.distrito } : {}),
      }));
      const situacaoBase = base.situacaoFinal;
      let situacaoFinal = situacaoBase;
      if (situacaoBase === "INDETERMINADO" || situacaoBase === "SEM_CDI") {
        situacaoFinal = isSalvador ? "SEM_CDI" : "FORA_SALVADOR";
      }
      return {
        ...base,
        situacaoFinal,
        unidadesElegiveis,
        ...(base.distritoPaciente ? {} : result.distrito ? { distritoPaciente: result.distrito } : {}),
        ...(base.bairroPaciente ? {} : { bairroPaciente: bairro }),
        ...(base.coIbgeMunicipio ? {} : isSalvador ? { coIbgeMunicipio: "2927408" } : {}),
        exigeEscolha: SITUACOES_QUE_EXIGEM_ESCOLHA.has(situacaoFinal),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao aplicar fallback de bairro: ${message}`);
      return base;
    }
  }

  private mapearOrientacao(raw: OrientacaoMaeSalvadorRaw): OrientacaoMaeSalvadorPayload {
    const situacaoFinal = (raw.situacao_final ?? "INDETERMINADO").toString().trim() || "INDETERMINADO";
    const unidadesElegiveis = (raw.unidades_elegiveis ?? []).map((item) => ({
      nome: item.nome,
      ...(item.cnes ? { cnes: item.cnes } : {}),
      ...(item.distrito ? { distrito: item.distrito } : {}),
    }));
    return {
      situacaoFinal,
      ...(raw.unidade_acompanhamento_nome ? { unidadeAcompanhamentoNome: raw.unidade_acompanhamento_nome } : {}),
      ...(raw.unidade_acompanhamento_cnes ? { unidadeAcompanhamentoCnes: raw.unidade_acompanhamento_cnes } : {}),
      ...(raw.unidade_cadastro_nome ? { unidadeCadastroNome: raw.unidade_cadastro_nome } : {}),
      ...(raw.unidade_cadastro_cnes ? { unidadeCadastroCnes: raw.unidade_cadastro_cnes } : {}),
      ...(raw.distrito_paciente ? { distritoPaciente: raw.distrito_paciente } : {}),
      ...(raw.no_bairro_paciente ? { bairroPaciente: raw.no_bairro_paciente } : {}),
      ...(raw.co_ibge_municipio ? { coIbgeMunicipio: raw.co_ibge_municipio } : {}),
      unidadesElegiveis,
      mensagem: raw.mensagem?.trim() || "Orientacao registrada.",
      exigeEscolha: SITUACOES_QUE_EXIGEM_ESCOLHA.has(situacaoFinal),
    };
  }

  private payloadIndeterminado(): OrientacaoMaeSalvadorPayload {
    return {
      situacaoFinal: "INDETERMINADO",
      unidadesElegiveis: [],
      mensagem: "Nao foi possivel determinar uma unidade automaticamente.",
      exigeEscolha: false,
    };
  }

  async buscarCnsPorDados(input: { nome: string; nomeMae?: string; dataNascimento?: string }) {
    const fontesIndisponiveis: string[] = [];
    try {
      const esus = await this.esusAdapter.buscarCnsPorDados(input);
      if (esus) return { sucesso: true, fonte: "esus", cidadao: esus, fontesIndisponiveis };
    } catch {
      fontesIndisponiveis.push("esus");
    }

    try {
      const fallback = await this.soapCnsAdapter.buscarCnsPorDados(input);
      if (fallback) return { sucesso: true, fonte: "soap", cidadao: fallback, fontesIndisponiveis };
    } catch {
      fontesIndisponiveis.push("soap");
    }

    return { sucesso: false, fontesIndisponiveis };
  }

  private async buscarCnsSoapDireto(documento: string): Promise<{
    cns: string;
    nome: string;
    cpf?: string;
    nomeMae?: string;
    nomePai?: string;
    dataNascimento?: string;
    sexo?: string;
    racaCor?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    municipio?: string;
  } | null> {
    const url = process.env.CNS_FEDERAL_URL?.trim();
    const user = process.env.CNS_FEDERAL_USER?.trim();
    const password = process.env.CNS_FEDERAL_PASSWORD;
    const doc = (documento ?? "").replace(/\D/g, "");
    if (!url || !user || !password || (doc.length !== 11 && doc.length !== 15)) return null;

    try {
      const action = doc.length === 11 ? "PesquisarPacientePorCPF" : "PesquisarPacientePorCNS";
      const tag = doc.length === 11 ? "cpf" : "cns";
      const envelope = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
        "  <soap:Body>",
        `    <ns:${action} xmlns:ns="http://servicos.nti.sms.salvador.ba.br/">`,
        `      <${tag}>${doc}</${tag}>`,
        `    </ns:${action}>`,
        "  </soap:Body>",
        "</soap:Envelope>",
      ].join("\n");
      const auth = Buffer.from(`${user}:${password}`, "utf-8").toString("base64");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Authorization: `Basic ${auth}`,
          SOAPAction: '""',
        },
        body: envelope,
      });
      const text = await response.text();
      if (!response.ok) return null;

      const firstTagValue = (xml: string, ...tags: string[]): string | undefined => {
        for (const tagName of tags) {
          const re = new RegExp(`<(?:\\w+:)?${tagName}\\b[^>]*>([^<]*)<\\/(?:\\w+:)?${tagName}>`, "i");
          const m = xml.match(re);
          const v = m?.[1]?.trim();
          if (v) return v;
        }
        return undefined;
      };

      const cnsMatch = text.match(/<numero>(\d{15})<\/numero>/i) ?? text.match(/<cns>(\d{15})<\/cns>/i);
      const nomeMatch = text.match(/<nome>([^<]+)<\/nome>/i) ?? text.match(/<no_cidadao>([^<]+)<\/no_cidadao>/i);
      const cpfMatch = text.match(/<cpf>(\d{11})<\/cpf>/i);
      const cns = cnsMatch?.[1]?.trim();
      const nome = nomeMatch?.[1]?.trim();
      if (!cns || !nome) return null;

      const nomeMae = firstTagValue(text, "nomeMae", "no_mae");
      const nomePai = firstTagValue(text, "nomePai", "no_pai");
      const dataNascimentoRaw = firstTagValue(text, "dataNascimento", "dt_nascimento");
      const sexo = firstTagValue(text, "sexo", "no_sexo");
      const racaCor = firstTagValue(text, "racaCor", "raca_cor");
      const logradouro = firstTagValue(text, "logradouro", "ds_logradouro");
      const numero = firstTagValue(text, "numero", "nu_numero");
      const complemento = firstTagValue(text, "complemento", "ds_complemento");
      const bairro = firstTagValue(text, "bairro", "no_bairro");
      const cep = firstTagValue(text, "cep", "ds_cep")?.replace(/\D/g, "").slice(0, 8);
      const municipio = firstTagValue(text, "municipioResidencia", "municipio", "no_localidade");
      const dataNascimento = dataNascimentoRaw?.slice(0, 10);

      return {
        cns,
        nome,
        ...(cpfMatch?.[1] ? { cpf: cpfMatch[1] } : {}),
        ...(nomeMae ? { nomeMae } : {}),
        ...(nomePai ? { nomePai } : {}),
        ...(dataNascimento ? { dataNascimento } : {}),
        ...(sexo ? { sexo } : {}),
        ...(racaCor ? { racaCor } : {}),
        ...(logradouro ? { logradouro } : {}),
        ...(numero ? { numero } : {}),
        ...(complemento ? { complemento } : {}),
        ...(bairro ? { bairro } : {}),
        ...(cep ? { cep } : {}),
        ...(municipio ? { municipio } : {}),
      };
    } catch {
      return null;
    }
  }
}
