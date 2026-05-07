const CADSUS_TIPO_LOGRADOURO_MAP: Record<string, string> = {
  "1": "ACESSO",
  "2": "ADRO",
  "4": "ALAMEDA",
  "8": "AVENIDA",
  "9": "BALNEARIO",
  "10": "BELVEDERE",
  "11": "BECO",
  "12": "BLOCO",
  "13": "BOSQUE",
  "14": "ARTERIA",
  "15": "ATALHO",
  "17": "CAMINHO",
  "21": "COLONIA",
  "23": "CAMPO",
  "24": "CORREGO",
  "27": "DESVIO",
  "28": "DISTRITO",
  "30": "ESCADA",
  "31": "ESTRADA",
  "32": "ESTACAO",
  "33": "ESTADIO",
  "37": "FAZENDA",
  "40": "FEIRA",
  "43": "FORTE",
  "45": "GALERIA",
  "46": "GRANJA",
  "50": "ILHA",
  "52": "JARDIM",
  "53": "LADEIRA",
  "54": "LARGO",
  "55": "LAGOA",
  "56": "LOTEAMENTO",
  "59": "MORRO",
  "60": "MONTE",
  "62": "PARALELA",
  "63": "PASSEIO",
  "64": "PATIO",
  "65": "PRACA",
  "67": "PARADA",
  "70": "PRAIA",
  "72": "PARQUE",
  "73": "PASSARELA",
  "74": "PASSAGEM",
  "77": "QUADRA",
  "79": "QUINTA",
  "81": "RUA",
  "82": "RAMAL",
  "87": "RECANTO",
  "88": "RETIRO",
  "89": "RETA",
  "90": "RODOVIA",
  "91": "RETORNO",
  "92": "SITIO",
  "94": "SERVIDAO",
  "95": "SETOR",
  "96": "SUBIDA",
  "97": "TRINCHEIRA",
  "98": "TERMINAL",
  "99": "TREVO",
  "100": "TRAVESSA",
  "101": "VIA",
  "103": "VIADUTO",
  "104": "VILA",
  "105": "VIELA",
  "106": "VALE",
  "108": "ZIGUE-ZAGUE",
};

const CANONICAL_TIPOS_LOGRADOURO = new Set(Object.values(CADSUS_TIPO_LOGRADOURO_MAP));

function normalize(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferFromLogradouro(logradouro: string | null | undefined): string | undefined {
  const value = normalize(logradouro ?? "");
  if (!value) return undefined;
  if (value.startsWith("RUA ")) return "RUA";
  if (value.startsWith("AV ") || value.startsWith("AVENIDA ")) return "AVENIDA";
  if (value.startsWith("TRAV ") || value.startsWith("TRAVESSA ")) return "TRAVESSA";
  if (value.startsWith("PCA ") || value.startsWith("PRACA ")) return "PRACA";
  return undefined;
}

export function resolveTipoLogradouroParaCadastro(params: {
  codigoCadSus?: string | null;
  nomeTipoLogradouro?: string | null;
  nomeLogradouro?: string | null;
}): string | undefined {
  const codeDigits = (params.codigoCadSus ?? "").replace(/\D/g, "");
  if (codeDigits) {
    const mapped = CADSUS_TIPO_LOGRADOURO_MAP[String(Number(codeDigits))];
    if (mapped) return mapped;
  }

  const n = normalize(params.nomeTipoLogradouro ?? "");
  if (n) {
    if (CANONICAL_TIPOS_LOGRADOURO.has(n)) return n;
    const firstToken = n.split(/\s+/)[0];
    if (firstToken && CANONICAL_TIPOS_LOGRADOURO.has(firstToken)) {
      return firstToken;
    }
  }

  return inferFromLogradouro(params.nomeLogradouro);
}
