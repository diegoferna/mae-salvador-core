import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Pool } from "pg";
import { AppConfig } from "../../core/AppConfig";
import { resolveTipoLogradouroParaCadastro } from "../../shared/logradouro/TipoLogradouroMapper";
import {
  OrientacaoMaeSalvadorRaw,
  OrientacaoUnidadeRaw,
} from "./EsusAdapter.types";

type CidadaoLookup = {
  cns: string;
  nome: string;
  cpf?: string;
  nomeSocial?: string;
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
  emails?: string;
  telefoneCelular?: string;
  telefoneResidencial?: string;
};

@Injectable()
export class EsusAdapter {
  private esusPool: Pool | null = null;
  private readonly logger = new Logger(EsusAdapter.name);

  constructor(@Inject(AppConfig) private readonly appConfig: AppConfig) {}

  async buscarCep(cep: string): Promise<{
    cep: string;
    logradouro: string;
    bairro: string;
    tipoLogradouro?: string;
    localidade?: string;
    uf?: string;
  } | null> {
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) return null;
    if (!this.appConfig.esusDatabaseUrlOptional) return null;

    return this.withTimeout(async () => {
      const pool = this.getPool();
      const result = await pool.query<{
        cep: string;
        tipo_logradouro: string | null;
        logradouro: string | null;
        bairro: string | null;
        localidade: string | null;
        uf: string | null;
      }>(
        `SELECT
           l.nu_cep::text AS cep,
           tl.no_tipo_logradouro AS tipo_logradouro,
           UPPER(coalesce(l.no_logradouro, '')) AS logradouro,
           coalesce(b.no_bairro, '') AS bairro,
           coalesce(loc.no_localidade, '') AS localidade,
           coalesce(uf.sg_uf, '') AS uf
         FROM tb_logradouro l
         LEFT JOIN tb_tipo_logradouro tl
           ON l.tp_logradouro::bigint = tl.co_tipo_logradouro
         LEFT JOIN tb_bairro b
           ON l.co_bairro_dne = b.nu_dne
         LEFT JOIN tb_localidade loc
           ON b.co_localidade::bigint = loc.co_localidade
         LEFT JOIN tb_uf uf
           ON loc.co_uf::bigint = uf.co_uf
         WHERE l.nu_cep = $1
         LIMIT 1`,
        [cepDigits],
      );
      const row = result.rows[0];
      if (!row) return null;
      const tipoLogradouro = resolveTipoLogradouroParaCadastro({
        nomeTipoLogradouro: row.tipo_logradouro,
        nomeLogradouro: row.logradouro,
      });
      return {
        cep: row.cep,
        logradouro: row.logradouro ?? "",
        bairro: row.bairro ?? "",
        ...(tipoLogradouro ? { tipoLogradouro } : {}),
        ...(row.localidade?.trim() ? { localidade: row.localidade.trim() } : {}),
        ...(row.uf?.trim() ? { uf: row.uf.trim() } : {}),
      };
    });
  }

  async buscarCnsPorDocumento(documento: string): Promise<CidadaoLookup | null> {
    const doc = documento.replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 15) return null;
    if (!this.appConfig.esusDatabaseUrlOptional) return null;

    return this.withTimeout(async () => {
      const pool = this.getPool();
      const result = await pool.query<Record<string, string | null>>(
        `SELECT
           c.nu_cns,
           c.nu_cpf,
           c.no_cidadao,
           c.no_social,
           c.no_mae,
           c.no_pai,
           c.dt_nascimento::text AS dt_nascimento,
           c.no_sexo,
           c.nu_telefone_celular,
           c.nu_telefone_residencial,
           c.ds_email,
           c.ds_logradouro,
           c.nu_numero,
           c.ds_complemento,
           c.no_bairro,
           c.ds_cep,
           r.no_raca_cor
         FROM tb_cidadao c
         LEFT JOIN tb_raca_cor r ON c.co_raca_cor = r.co_raca_cor
         WHERE (length($1) = 11 AND regexp_replace(coalesce(c.nu_cpf,''), '\D', '', 'g') = $1)
            OR (length($1) = 15 AND regexp_replace(coalesce(c.nu_cns,''), '\D', '', 'g') = $1)
         LIMIT 1`,
        [doc],
      );
      const row = result.rows[0];
      if (!row?.nu_cns || !row?.no_cidadao) return null;
      const digits = (v?: string | null, max = 255) => (v ?? "").replace(/\D/g, "").slice(0, max);
      const trim = (v?: string | null) => (v ?? "").trim();
      const cns = digits(row.nu_cns, 15);
      const cpf = digits(row.nu_cpf, 11);
      const nome = trim(row.no_cidadao);
      if (!cns || !nome) return null;
      return {
        ...(cpf ? { cpf } : {}),
        cns,
        nome,
        ...(trim(row.no_social) ? { nomeSocial: trim(row.no_social) } : {}),
        ...(trim(row.no_mae) ? { nomeMae: trim(row.no_mae) } : {}),
        ...(trim(row.no_pai) ? { nomePai: trim(row.no_pai) } : {}),
        ...(trim(row.dt_nascimento) ? { dataNascimento: trim(row.dt_nascimento).slice(0, 10) } : {}),
        ...(trim(row.no_sexo) ? { sexo: trim(row.no_sexo) } : {}),
        ...(trim(row.no_raca_cor) ? { racaCor: trim(row.no_raca_cor) } : {}),
        ...(trim(row.ds_logradouro) ? { logradouro: trim(row.ds_logradouro) } : {}),
        ...(trim(row.nu_numero) ? { numero: trim(row.nu_numero) } : {}),
        ...(trim(row.ds_complemento) ? { complemento: trim(row.ds_complemento) } : {}),
        ...(trim(row.no_bairro) ? { bairro: trim(row.no_bairro) } : {}),
        ...(digits(row.ds_cep, 8) ? { cep: digits(row.ds_cep, 8) } : {}),
        ...(trim(row.ds_email) ? { emails: trim(row.ds_email) } : {}),
        ...(digits(row.nu_telefone_celular, 11) ? { telefoneCelular: digits(row.nu_telefone_celular, 11) } : {}),
        ...(digits(row.nu_telefone_residencial, 10) ? { telefoneResidencial: digits(row.nu_telefone_residencial, 10) } : {}),
      };
    });
  }

  async buscarCnsPorDados(input: {
    nome: string;
    nomeMae?: string;
    dataNascimento?: string;
  }): Promise<CidadaoLookup | null> {
    const nome = input.nome.trim().replace(/\s{2,}/g, " ");
    const nomeMae = input.nomeMae?.trim();
    const dataNascimento = input.dataNascimento?.trim();
    if (!nome) return null;
    if (!this.appConfig.esusDatabaseUrlOptional) return null;

    return this.withTimeout(async () => {
      const pool = this.getPool();
      const normalizeSqlExpr = (expr: string) =>
        `translate(upper(${expr}), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC')`;
      const runQuery = async (activeOnly: boolean) =>
        pool.query<Record<string, string | null>>(
          `SELECT
           c.nu_cns,
           c.nu_cpf,
           c.no_cidadao,
           c.no_social,
           c.no_mae,
           c.no_pai,
           c.dt_nascimento::text AS dt_nascimento,
           c.no_sexo,
           c.nu_telefone_celular,
           c.nu_telefone_residencial,
           c.ds_email,
           c.ds_logradouro,
           c.nu_numero,
           c.ds_complemento,
           c.no_bairro,
           c.ds_cep,
           r.no_raca_cor
         FROM tb_cidadao c
         LEFT JOIN tb_raca_cor r ON c.co_raca_cor = r.co_raca_cor
         WHERE ${activeOnly ? "c.st_ativo = 1" : "TRUE"}
           AND ${normalizeSqlExpr("c.no_cidadao")} ILIKE '%' || ${normalizeSqlExpr("$1")} || '%'
           AND ($2::text IS NULL OR ${normalizeSqlExpr("coalesce(c.no_mae, '')")} ILIKE '%' || ${normalizeSqlExpr("$2")} || '%')
           AND ($3::date IS NULL OR c.dt_nascimento::date = $3::date)
         ORDER BY c.dt_atualizado DESC NULLS LAST
         LIMIT 1`,
          [nome, nomeMae ?? null, dataNascimento ?? null],
        );
      const resultAtivo = await runQuery(true);
      const result = resultAtivo.rows[0] ? resultAtivo : await runQuery(false);
      const row = result.rows[0];
      if (!row?.nu_cns || !row?.no_cidadao) return null;
      const digits = (v?: string | null, max = 255) => (v ?? "").replace(/\D/g, "").slice(0, max);
      const trim = (v?: string | null) => (v ?? "").trim();
      const cns = digits(row.nu_cns, 15);
      const cpf = digits(row.nu_cpf, 11);
      const nomeOut = trim(row.no_cidadao);
      if (!cns || !nomeOut) return null;
      return {
        ...(cpf ? { cpf } : {}),
        cns,
        nome: nomeOut,
        ...(trim(row.no_social) ? { nomeSocial: trim(row.no_social) } : {}),
        ...(trim(row.no_mae) ? { nomeMae: trim(row.no_mae) } : {}),
        ...(trim(row.no_pai) ? { nomePai: trim(row.no_pai) } : {}),
        ...(trim(row.dt_nascimento) ? { dataNascimento: trim(row.dt_nascimento).slice(0, 10) } : {}),
        ...(trim(row.no_sexo) ? { sexo: trim(row.no_sexo) } : {}),
        ...(trim(row.no_raca_cor) ? { racaCor: trim(row.no_raca_cor) } : {}),
        ...(trim(row.ds_logradouro) ? { logradouro: trim(row.ds_logradouro) } : {}),
        ...(trim(row.nu_numero) ? { numero: trim(row.nu_numero) } : {}),
        ...(trim(row.ds_complemento) ? { complemento: trim(row.ds_complemento) } : {}),
        ...(trim(row.no_bairro) ? { bairro: trim(row.no_bairro) } : {}),
        ...(digits(row.ds_cep, 8) ? { cep: digits(row.ds_cep, 8) } : {}),
        ...(trim(row.ds_email) ? { emails: trim(row.ds_email) } : {}),
        ...(digits(row.nu_telefone_celular, 11) ? { telefoneCelular: digits(row.nu_telefone_celular, 11) } : {}),
        ...(digits(row.nu_telefone_residencial, 10) ? { telefoneResidencial: digits(row.nu_telefone_residencial, 10) } : {}),
      };
    });
  }

  async orientarMaeSalvador(cns: string): Promise<OrientacaoMaeSalvadorRaw | null> {
    return this.withTimeout(async () => {
      const pool = this.getPool();
      const result = await pool.query<{
        situacao_final: string | null;
        unidade_acompanhamento_nome: string | null;
        unidade_acompanhamento_cnes: string | null;
        unidade_cadastro_nome: string | null;
        unidade_cadastro_cnes: string | null;
        distrito_paciente: string | null;
        no_bairro_paciente: string | null;
        co_ibge_municipio: string | null;
        unidades_elegiveis: unknown;
        mensagem: string | null;
      }>(
        `SELECT situacao_final,
                unidade_acompanhamento_nome,
                unidade_acompanhamento_cnes,
                unidade_cadastro_nome,
                unidade_cadastro_cnes,
                distrito_paciente,
                no_bairro_paciente,
                co_ibge_municipio,
                unidades_elegiveis,
                mensagem
           FROM fn_orientacao_mae_salvador_v2($1)`,
        [cns],
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        situacao_final: (row.situacao_final ?? "INDETERMINADO").toString(),
        unidade_acompanhamento_nome: row.unidade_acompanhamento_nome,
        unidade_acompanhamento_cnes: row.unidade_acompanhamento_cnes,
        unidade_cadastro_nome: row.unidade_cadastro_nome,
        unidade_cadastro_cnes: row.unidade_cadastro_cnes,
        distrito_paciente: row.distrito_paciente,
        no_bairro_paciente: row.no_bairro_paciente,
        co_ibge_municipio: row.co_ibge_municipio,
        unidades_elegiveis: this.parseUnidadesElegiveis(row.unidades_elegiveis),
        mensagem: row.mensagem,
      };
    });
  }

  /**
   * Lista unidades elegiveis a partir do bairro informado pelo cadastro (app DB).
   * Usado como fallback quando o paciente ainda nao tem cadastro em tb_cidadao/e-SUS
   * e a fn_orientacao_mae_salvador_v2 retorna sem unidades.
   *
   * - isSalvador=true  -> usa tb_bairro_x_distrito para resolver o distrito
   *                       e filtra tb_apoio_unidades_bi por esse distrito.
   * - isSalvador=false -> retorna apenas UBSs de demanda livre (no_unidade_saude ILIKE 'UBS%').
   */
  async listarUnidadesPorBairro(
    bairro: string,
    isSalvador: boolean,
  ): Promise<{ distrito: string | null; unidades: OrientacaoUnidadeRaw[] }> {
    if (!this.appConfig.esusDatabaseUrlOptional) {
      return { distrito: null, unidades: [] };
    }
    const bairroNorm = (bairro ?? "").trim();
    if (!bairroNorm) {
      return { distrito: null, unidades: [] };
    }
    return this.withTimeout(async () => {
      const pool = this.getPool();
      const result = await pool.query<{
        no_unidade: string | null;
        no_cnes: string | null;
        no_distrito_sanitario: string | null;
        distrito_paciente: string | null;
      }>(
        `WITH paciente_distrito AS (
           SELECT bd.no_distrito_sanitario::text AS distrito
             FROM tb_bairro_x_distrito bd
            WHERE upper(trim(bd.no_bairro)) = upper(trim($1::text))
            LIMIT 1
         )
         SELECT
           u.no_unidade_saude::text       AS no_unidade,
           u.nu_cnes::text                AS no_cnes,
           u.no_distrito_sanitario::text  AS no_distrito_sanitario,
           (SELECT distrito FROM paciente_distrito) AS distrito_paciente
         FROM tb_apoio_unidades_bi u
         WHERE
           ( $2::boolean = false AND u.no_unidade_saude ILIKE 'UBS%' )
           OR
           ( $2::boolean = true
             AND (SELECT distrito FROM paciente_distrito) IS NOT NULL
             AND u.no_distrito_sanitario = (SELECT distrito FROM paciente_distrito) )
         ORDER BY u.no_unidade_saude ASC`,
        [bairroNorm, isSalvador],
      );
      const distrito = result.rows[0]?.distrito_paciente ?? null;
      const unidades: OrientacaoUnidadeRaw[] = result.rows
        .filter((row) => Boolean(row.no_unidade))
        .map((row) => ({
          nome: row.no_unidade as string,
          cnes: row.no_cnes ?? null,
          distrito: row.no_distrito_sanitario ?? null,
        }));
      return { distrito, unidades };
    });
  }

  private parseUnidadesElegiveis(value: unknown): OrientacaoUnidadeRaw[] {
    if (!value) return [];
    let array: unknown[] = [];
    if (Array.isArray(value)) {
      array = value;
    } else if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) array = parsed;
      } catch {
        return [];
      }
    }
    const out: OrientacaoUnidadeRaw[] = [];
    for (const item of array) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const nome = typeof obj.nome === "string" ? obj.nome.trim() : "";
      if (!nome) continue;
      const cnesRaw = obj.cnes;
      const distritoRaw = obj.distrito;
      out.push({
        nome,
        cnes: typeof cnesRaw === "string" && cnesRaw.trim() ? cnesRaw.trim() : null,
        distrito: typeof distritoRaw === "string" && distritoRaw.trim() ? distritoRaw.trim() : null,
      });
    }
    return out;
  }

  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs = 10000): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ServiceUnavailableException("esus_timeout")), timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro de integracao e-SUS: ${message}`);
      throw new ServiceUnavailableException("esus_unavailable");
    }
  }

  private getPool(): Pool {
    if (!this.esusPool) {
      const connectionString = process.env.ESUS_DATABASE_URL?.trim() || this.appConfig.esusDatabaseUrlOptional;
      if (!connectionString) {
        throw new ServiceUnavailableException("esus_not_configured");
      }
      try {
        const parsed = new URL(connectionString);
        this.logger.log(
          `Conectando e-SUS em ${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`,
        );
      } catch {
        this.logger.warn("Conectando e-SUS com URL nao parseavel");
      }
      this.esusPool = new Pool({
        connectionString,
        max: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      });
    }
    return this.esusPool;
  }
}
