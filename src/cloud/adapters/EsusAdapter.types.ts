export interface OrientacaoUnidadeRaw {
  nome: string;
  cnes: string | null;
  distrito: string | null;
}

export type SituacaoFinalRaw =
  | "VINCULADA_PRE_NATAL"
  | "CDI_MESMO_DISTRITO"
  | "CDI_OUTRO_DISTRITO"
  | "SEM_CDI"
  | "FORA_SALVADOR"
  | "INDETERMINADO";

export interface OrientacaoMaeSalvadorRaw {
  situacao_final: SituacaoFinalRaw | string;
  unidade_acompanhamento_nome: string | null;
  unidade_acompanhamento_cnes: string | null;
  unidade_cadastro_nome: string | null;
  unidade_cadastro_cnes: string | null;
  distrito_paciente: string | null;
  no_bairro_paciente: string | null;
  co_ibge_municipio: string | null;
  unidades_elegiveis: OrientacaoUnidadeRaw[] | null;
  mensagem: string | null;
}
