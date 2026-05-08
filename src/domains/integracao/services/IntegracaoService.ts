import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EsusAdapter } from "../../../cloud/adapters/EsusAdapter";
import { NominatimAdapter } from "../../../cloud/adapters/NominatimAdapter";
import { SoapCnsAdapter } from "../../../cloud/adapters/SoapCnsAdapter";

@Injectable()
export class IntegracaoService {
  private readonly logger = new Logger(IntegracaoService.name);

  constructor(
    private readonly esusAdapter: EsusAdapter,
    private readonly soapCnsAdapter: SoapCnsAdapter,
    private readonly nominatimAdapter: NominatimAdapter,
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

  geocodificarEndereco(endereco: string): Promise<{ lat: number; lon: number } | null> {
    return this.nominatimAdapter.geocodificar(endereco);
  }

  async confirmarOrientacao(cns: string, lat?: number, lon?: number): Promise<string> {
    if (typeof lat === "number" && typeof lon === "number") {
      try {
        await this.esusAdapter.atualizarGpsPaciente(cns, lat, lon);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Falha ao atualizar GPS do paciente no e-SUS: ${message}`);
      }
    }

    const orientacao = await this.esusAdapter.orientarMaeSalvador(cns, lat, lon);
    return orientacao ?? "Orientacao registrada com sucesso.";
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
