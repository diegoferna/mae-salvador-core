import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { AppConfig } from "../../core/AppConfig";
import { resolveTipoLogradouroParaCadastro } from "../../shared/logradouro/TipoLogradouroMapper";

type CidadaoLookup = {
  cns: string;
  nome: string;
  cpf?: string;
  nomeMae?: string;
  nomePai?: string;
  dataNascimento?: string;
  sexo?: string;
  racaCor?: string;
  logradouro?: string;
  tipoLogradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  emails?: string;
  ddd?: string;
  telefoneCelular?: string;
  telefoneResidencial?: string;
};

type RacaCorSoapCodigo = "01" | "02" | "03" | "04" | "05" | "99";

const RACA_COR_SOAP_MAP: Record<RacaCorSoapCodigo, string> = {
  "01": "BRANCA",
  "02": "PRETA",
  "03": "PARDA",
  "04": "AMARELA",
  "05": "INDIGENA",
  "99": "SEM INFORMACAO",
};

@Injectable()
export class SoapCnsAdapter {
  private readonly logger = new Logger(SoapCnsAdapter.name);

  constructor(@Inject(AppConfig) private readonly appConfig: AppConfig) {}

  async buscarCnsFallback(documento: string): Promise<CidadaoLookup | null> {
    const doc = (documento ?? "").replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 15) return null;
    if (!this.appConfig.isCnsFederalConfigured) return null;

    return this.withTimeout(async () => {
      const url =
        process.env.CNS_FEDERAL_URL?.trim() || this.appConfig.cnsFederalUrlWithDefault;
      const user =
        process.env.CNS_FEDERAL_USER?.trim() || this.appConfig.cnsFederalUser;
      const password =
        process.env.CNS_FEDERAL_PASSWORD || this.appConfig.cnsFederalPassword;
      this.logger.log(`Consultando SOAP CNS em ${url}`);
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
      if (!response.ok) throw new ServiceUnavailableException("soap_cns_http_error");
      return this.parsePacienteFromBody(text);
    });
  }

  async buscarCnsPorDados(input: {
    nome: string;
    nomeMae?: string;
    dataNascimento?: string;
  }): Promise<CidadaoLookup | null> {
    const nome = (input.nome ?? "").trim();
    const nomeMae = (input.nomeMae ?? "").trim();
    const dataNascimento = (input.dataNascimento ?? "").trim().slice(0, 10);
    if (!nome || !this.appConfig.isCnsFederalConfigured) return null;

    return this.withTimeout(async () => {
      if (dataNascimento && /^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        const byNomeData = await this.callSoapByAction(
          "PesquisarPacientePorNomeDataNascimento",
          `<nome>${this.escapeXml(nome)}</nome><dataNascimento>${this.escapeXml(`${dataNascimento}T00:00:00`)}</dataNascimento>`,
        );
        if (byNomeData) return byNomeData;
      }

      if (nomeMae) {
        const byNomeMae = await this.callSoapByAction(
          "PesquisarPacientePorNomeNomeMae",
          `<nome>${this.escapeXml(nome)}</nome><nomeMae>${this.escapeXml(nomeMae)}</nomeMae>`,
        );
        if (byNomeMae) return byNomeMae;
      }

      return null;
    });
  }

  private parsePacienteFromBody(xml: string): CidadaoLookup | null {
    const body = this.extractSoapBody(xml);
    if (!body) return null;
    if (this.parseSoapFault(body)) return null;

    const cnsBlocks = this.extractBlocks(body, "cns");
    const cnsEntries = cnsBlocks.map((b) => ({
      numero: this.firstTagValue(b, "numero", "cns"),
      tipo: this.firstTagValue(b, "tipo"),
    }));
    const cnsDefinitivo =
      cnsEntries.find((e) => {
        const num = (e.numero ?? "").replace(/\D/g, "");
        const tipo = (e.tipo ?? "")
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return num.length === 15 && (tipo.includes("DEFINIT") || tipo === "D");
      }) ??
      cnsEntries.find((e) => (e.numero ?? "").replace(/\D/g, "").length === 15) ??
      null;
    const cns =
      cnsDefinitivo?.numero ??
      this.firstTagValue(body, "cns", "numero", "nu_cns", "numeroCns", "numCns");
    const nome = this.firstTagValue(body, "nome", "no_cidadao", "nomePaciente");
    if (!cns || !nome) return null;

    const out: CidadaoLookup = {
      cns: cns.replace(/\D/g, "").slice(0, 15),
      nome: nome.trim(),
    };

    const cpf = this.firstTagValue(body, "cpf", "nu_cpf");
    if (cpf) out.cpf = cpf.replace(/\D/g, "").slice(0, 11);

    const nomeMae = this.firstTagValue(body, "nomeMae", "no_mae");
    if (nomeMae) out.nomeMae = nomeMae.trim();
    const nomePai = this.firstTagValue(body, "nomePai", "no_pai");
    if (nomePai) out.nomePai = nomePai.trim();
    const dataNascimento = this.firstTagValue(body, "dataNascimento", "dt_nascimento");
    if (dataNascimento) out.dataNascimento = dataNascimento.trim().slice(0, 10);
    const sexo = this.firstTagValue(body, "sexo", "no_sexo");
    if (sexo) out.sexo = sexo.trim();
    const racaCor = this.firstTagValue(body, "racaCor", "raca_cor", "codigoRacaCor");
    const racaNormalizada = this.normalizarRacaCorSoap(racaCor);
    if (racaNormalizada) out.racaCor = racaNormalizada;

    const endereco = this.extractBlocks(body, "endereco")[0] ?? body;
    const logradouro = this.firstTagValue(endereco, "logradouro");
    if (logradouro) out.logradouro = logradouro.trim();
    const tipoLogradouro = this.firstTagValue(endereco, "tipoLogradouro");
    const codigoTipoLogradouro = this.firstTagValue(endereco, "codigoTipoLogradouro");
    const tipoLogradouroNormalizado = resolveTipoLogradouroParaCadastro({
      codigoCadSus: codigoTipoLogradouro,
      nomeTipoLogradouro: tipoLogradouro,
      nomeLogradouro: logradouro,
    });
    if (tipoLogradouroNormalizado) out.tipoLogradouro = tipoLogradouroNormalizado;
    const numero = this.firstTagValue(endereco, "numero");
    if (numero) out.numero = numero.trim();
    const complemento = this.firstTagValue(endereco, "complemento");
    if (complemento) out.complemento = complemento.trim();
    const bairro = this.firstTagValue(endereco, "bairro");
    if (bairro) out.bairro = bairro.trim();
    const cep = this.firstTagValue(endereco, "cep");
    if (cep) out.cep = cep.replace(/\D/g, "").slice(0, 8);
    const municipio = this.firstTagValue(endereco, "municipioResidencia", "municipio");
    if (municipio) out.municipio = municipio.trim();

    const emails = this.firstTagValue(body, "emails", "email");
    if (emails) out.emails = emails.trim();
    const ddd = this.firstTagValue(body, "ddd")?.replace(/\D/g, "").slice(0, 2);
    if (ddd) out.ddd = ddd;
    const telCel = this.firstTagValue(body, "telefoneCelular", "nu_telefone_celular");
    const telRes = this.firstTagValue(body, "telefoneResidencial", "nu_telefone_residencial");
    const telCelDigits = telCel?.replace(/\D/g, "");
    const telResDigits = telRes?.replace(/\D/g, "");
    if (telCelDigits) {
      out.telefoneCelular = ddd && telCelDigits.length <= 9 ? `${ddd}${telCelDigits}` : telCelDigits.slice(0, 11);
    }
    if (telResDigits) {
      out.telefoneResidencial = ddd && telResDigits.length <= 8 ? `${ddd}${telResDigits}` : telResDigits.slice(0, 10);
    }

    return out;
  }

  private extractSoapBody(xml: string): string | null {
    const match =
      xml.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/i) ??
      xml.match(/<Body[^>]*>([\s\S]*?)<\/Body>/i);
    return match ? match[1].trim() : null;
  }

  private parseSoapFault(xml: string): string | null {
    const faultMatch =
      xml.match(/<soap:Fault>[\s\S]*?<faultstring[^>]*>([^<]+)<\/faultstring>/i) ??
      xml.match(/<Fault>[\s\S]*?<faultstring[^>]*>([^<]+)<\/faultstring>/i);
    return faultMatch ? faultMatch[1].trim() : null;
  }

  private extractBlocks(xml: string, tagName: string): string[] {
    const re = new RegExp(
      `<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`,
      "gi",
    );
    const out: string[] = [];
    let m: RegExpExecArray | null;
    do {
      m = re.exec(xml);
      if (m?.[1]) out.push(m[1]);
    } while (m);
    return out;
  }

  private firstTagValue(xml: string, ...tags: string[]): string | null {
    for (const t of tags) {
      const re = new RegExp(`<(?:\\w+:)?${t}\\b[^>]*>([^<]*)<\\/(?:\\w+:)?${t}>`, "i");
      const m = xml.match(re);
      const v = m?.[1]?.trim();
      if (v) return v;
    }
    return null;
  }

  private normalizarRacaCorSoap(valor: string | null): string | undefined {
    if (!valor) return undefined;
    const v = valor.trim();
    if (!v) return undefined;
    const digits = v.replace(/\D/g, "");
    const codigo = digits.length === 1 ? `0${digits}` : digits.slice(0, 2);
    if (codigo in RACA_COR_SOAP_MAP) {
      return RACA_COR_SOAP_MAP[codigo as RacaCorSoapCodigo];
    }
    const norm = v
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (norm.includes("BRANCA")) return "BRANCA";
    if (norm.includes("PRETA")) return "PRETA";
    if (norm.includes("PARDA")) return "PARDA";
    if (norm.includes("AMARELA")) return "AMARELA";
    if (norm.includes("INDIGENA")) return "INDIGENA";
    if (norm.includes("SEM INFORMACAO")) return "SEM INFORMACAO";
    return undefined;
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private async callSoapByAction(action: string, innerBody: string): Promise<CidadaoLookup | null> {
    const url =
      process.env.CNS_FEDERAL_URL?.trim() || this.appConfig.cnsFederalUrlWithDefault;
    const user =
      process.env.CNS_FEDERAL_USER?.trim() || this.appConfig.cnsFederalUser;
    const password =
      process.env.CNS_FEDERAL_PASSWORD || this.appConfig.cnsFederalPassword;
    const envelope = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "  <soap:Body>",
      `    <ns:${action} xmlns:ns="http://servicos.nti.sms.salvador.ba.br/">`,
      `      ${innerBody}`,
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
    if (!response.ok) {
      throw new ServiceUnavailableException("soap_cns_http_error");
    }

    return this.parsePacienteFromBody(text);
  }

  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs = 10000): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ServiceUnavailableException("soap_cns_timeout")), timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro de integracao SOAP CNS: ${message}`);
      throw new ServiceUnavailableException("soap_cns_unavailable");
    }
  }
}
