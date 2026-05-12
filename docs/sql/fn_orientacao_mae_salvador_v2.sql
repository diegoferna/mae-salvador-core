--
-- fn_orientacao_mae_salvador_v2
-- =========================================================================
-- Banco: e-SUS PEC (executar com a connection string ESUS_DATABASE_URL).
--
-- Objetivo: nova versao da orientacao Mae Salvador, com retorno ESTRUTURADO
-- (RETURNS TABLE + jsonb) consumido diretamente pelo backend GraphQL —
-- eliminando parsing de texto e qualquer dependencia de geolocalizacao
-- (latitude/longitude removidos do contrato).
--
-- IMPORTANTE: esta funcao convive em paralelo com a versao antiga
-- fn_orientacao_mae_salvador(varchar) RETURNS text, que NAO eh alterada
-- por este script. A versao antiga continua disponivel para sistemas
-- legados que ainda dependem do retorno textual; a v2 eh exclusiva do
-- mae-salvador-core/src/cloud/adapters/EsusAdapter.ts.
--
-- Contrato:
--   SELECT * FROM fn_orientacao_mae_salvador_v2(p_cns_paciente := '<15 digitos>')
--   -> 1 linha unica com 10 colunas
--   -> coluna unidades_elegiveis = jsonb array
--                                  [{ "nome": text, "cnes": text, "distrito": text }, ...]
--
-- Logica clinica preservada 100% da versao original
-- (atendimentos_periodo, classificacao_eventos, resumo_temporal,
--  status_gestante, unidade_vencedora, cadastro_individual, paciente_local,
--  paciente_distrito, recomendacoes). Acrescimos:
--   - no_cnes em unidade_acompanhamento, unidade_cadastro e unidades_elegiveis
--   - exposicao escalar de distrito/bairro/IBGE
--   - jsonb_agg substitui string_agg para a lista de unidades
--   - enum situacao_final combina status clinico + roteamento territorial
--
-- Cenarios derivados em situacao_final (string enum, NUNCA traduzir):
--   VINCULADA_PRE_NATAL  -> usa unidade_acompanhamento, sem escolha.
--   CDI_MESMO_DISTRITO   -> mantem unidade_cadastro, sem escolha.
--   CDI_OUTRO_DISTRITO   -> exibe unidade_cadastro + unidades_elegiveis.
--   SEM_CDI              -> exibe somente unidades_elegiveis.
--   FORA_SALVADOR        -> exibe unidades_elegiveis filtradas (UBS%).
--   INDETERMINADO        -> fallback informativo, sem escolha forcada.
--
-- Versionamento: alterar este arquivo SEMPRE que mudar a v2 no e-SUS.
-- =========================================================================

CREATE OR REPLACE FUNCTION fn_orientacao_mae_salvador_v2(p_cns_paciente varchar)
RETURNS TABLE (
    situacao_final              text,
    unidade_acompanhamento_nome text,
    unidade_acompanhamento_cnes text,
    unidade_cadastro_nome       text,
    unidade_cadastro_cnes       text,
    distrito_paciente           text,
    no_bairro_paciente          text,
    co_ibge_municipio           text,
    unidades_elegiveis          jsonb,
    mensagem                    text
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH parametros AS (
        SELECT p_cns_paciente AS cns_busca,
               294            AS dias_retroativos
    ),

    -- ============================================================
    -- ETAPA 1 - LOGICA CLINICA PRESERVADA (identica a v1)
    -- ============================================================
    atendimentos_periodo AS (
        SELECT
            p.co_seq_fat_atend_ind_problemas AS id_registro,
            t.dt_registro                    AS dt_atendimento,
            p.co_dim_unidade_saude_1         AS co_unidade_saude,
            u.no_unidade_saude,
            ciap.nu_ciap                     AS co_ciap,
            cid.nu_cid                       AS nu_cid_limpo,
            cbo.nu_cbo                       AS codigo_cbo,
            turno.ds_turno
        FROM tb_fat_atd_ind_problemas p
        JOIN parametros param                       ON trim(p.nu_cns) = trim(param.cns_busca)
        JOIN tb_fat_atendimento_individual fai      ON fai.co_seq_fat_atd_ind = p.co_fat_atd_ind
        JOIN tb_dim_tempo t                         ON t.co_seq_dim_tempo = p.co_dim_tempo
        JOIN tb_dim_turno turno                     ON turno.co_seq_dim_turno = fai.co_dim_turno
        LEFT JOIN tb_dim_unidade_saude u            ON u.co_seq_dim_unidade_saude = p.co_dim_unidade_saude_1
        LEFT JOIN tb_dim_ciap ciap                  ON ciap.co_seq_dim_ciap = p.co_dim_ciap
        LEFT JOIN tb_dim_cid cid                    ON cid.co_seq_dim_cid = p.co_dim_cid
        LEFT JOIN tb_dim_cbo cbo                    ON cbo.co_seq_dim_cbo = p.co_dim_cbo_1
        WHERE t.dt_registro >= current_date - (SELECT dias_retroativos FROM parametros)
    ),
    classificacao_eventos AS (
        SELECT
            id_registro,
            dt_atendimento,
            co_unidade_saude,
            no_unidade_saude,
            ds_turno,
            CASE
                WHEN (
                    co_ciap IN ('W78','W79','W81','W84','W85','ABP001')
                    OR nu_cid_limpo IN (
                      'O11','O120','O121','O122','O13','O140','O141','O149','O150','O151','O159','O16','O200',
                      'O208','O209','O210','O211','O212','O218','O219','O220','O221','O222','O223','O224','O225',
                      'O228','O229','O230','O231','O232','O233','O234','O235','O239','O299','O300','O301','O302',
                      'O308','O309','O311','O312','O318','O320','O321','O322','O323','O324','O325','O326','O328',
                      'O329','O330','O331','O332','O333','O334','O335','O336','O337','O338','O752','O753','O990',
                      'O991','O992','O993','O994','O240','O241','O242','O243','O244','O249','O25','O260','O261',
                      'O263','O264','O265','O268','O269','O280','O281','O282','O283','O284','O285','O288','O289',
                      'O290','O291','O292','O293','O294','O295','O296','O298','O339','O340','O341','O342','O343',
                      'O344','O345','O346','O347','O348','O349','O350','O351','O352','O353','O354','O355','O356',
                      'O357','O358','O359','O360','O361','O362','O363','O365','O366','O367','O368','O369','O40',
                      'O410','O411','O418','O419','O430','O431','O438','O439','O440','O441','O460','O468','O469',
                      'O470','O471','O479','O48','O995','O996','O997','Z640','O10','O12','O14','O15','O20','O21',
                      'O22','O23','O24','O26','O28','O29','O30','O31','O32','O33','O34','O35','O36','O41','O43',
                      'O44','O46','O47','O98','Z34','Z35','Z36','Z321','Z33','Z340','Z348','Z349','Z350','Z351',
                      'Z352','Z353','Z354','Z357','Z358','Z359'
                    )
                )
                AND substring(codigo_cbo, 1, 4) IN ('2231','2251','2252','2253','2235')
                THEN 1 ELSE 0
            END AS is_pre_natal,
            CASE
                WHEN (
                    co_ciap IN ('48','49','P29','W18','W19','W70','W90','W91','W92','W93','W94','W95','W96','W82','W83','ABP002')
                    OR nu_cid_limpo IN (
                      'F53','F530','F531','F538','F539','O10','O100','O101','O102','O103','O104','O109','O85',
                      'O86','O87','O90','O91','O92','O94','O98','O99','M830','O152','O266','O722','O723','Z391',
                      'Z392','O860','O861','O862','O863','O864','O868','O870','O871','O872','O873','O878','O879',
                      'O900','O901','O902','O903','O904','O905','O908','O909','O910','O911','O912','O920','O921',
                      'O922','O923','O924','O925','O926','O927','O998','Z39','O02','O021','O03','O04','O05','O06','Z303'
                    )
                )
                AND substring(codigo_cbo, 1, 4) IN ('2231','2251','2252','2253','2235')
                THEN 1 ELSE 0
            END AS is_finalizador
        FROM atendimentos_periodo
    ),
    resumo_temporal AS (
        SELECT
            max(CASE WHEN is_pre_natal   = 1 THEN dt_atendimento END) AS dt_ultimo_prenatal,
            max(CASE WHEN is_finalizador = 1 THEN dt_atendimento END) AS dt_ultimo_finalizador
        FROM classificacao_eventos
    ),
    status_gestante AS (
        SELECT
            CASE
                WHEN r.dt_ultimo_prenatal IS NULL
                    THEN 'NAO_POSSUI_PRE_NATAL'
                WHEN r.dt_ultimo_finalizador IS NOT NULL
                    AND r.dt_ultimo_finalizador > r.dt_ultimo_prenatal
                    THEN 'NOVA_GESTACAO'
                ELSE 'VINCULADA_PRE_NATAL'
            END AS status_clinico,
            r.dt_ultimo_finalizador
        FROM resumo_temporal r
    ),

    -- ============================================================
    -- ETAPA 2 - ROTEAMENTO (preserva logica; adiciona no_cnes)
    -- ============================================================
    unidade_vencedora AS (
        SELECT
            sub.no_unidade_saude AS unidade_acompanhamento,
            sub.no_cnes_unidade  AS unidade_acompanhamento_cnes
        FROM (
            SELECT
                c.co_unidade_saude,
                c.no_unidade_saude,
                dim.nu_cnes AS no_cnes_unidade,
                count(distinct c.dt_atendimento) AS qtd_atendimentos,
                max(c.dt_atendimento)            AS dt_atendimento_mais_recente,
                max(CASE WHEN c.ds_turno ilike '%noite%' THEN 3
                         WHEN c.ds_turno ilike '%tarde%' THEN 2
                         ELSE 1 END)             AS peso_turno_maximo,
                max(c.id_registro)               AS id_mais_recente
            FROM classificacao_eventos c
            CROSS JOIN status_gestante s
            LEFT JOIN tb_dim_unidade_saude dim ON dim.co_seq_dim_unidade_saude = c.co_unidade_saude
            WHERE c.is_pre_natal = 1
              AND s.status_clinico = 'VINCULADA_PRE_NATAL'
              AND (s.dt_ultimo_finalizador IS NULL OR c.dt_atendimento > s.dt_ultimo_finalizador)
            GROUP BY c.co_unidade_saude, c.no_unidade_saude, dim.nu_cnes
        ) sub
        ORDER BY sub.qtd_atendimentos             DESC,
                 sub.dt_atendimento_mais_recente DESC,
                 sub.peso_turno_maximo            DESC,
                 sub.id_mais_recente              DESC
        LIMIT 1
    ),
    cadastro_individual AS (
        SELECT DISTINCT ON (c.nu_cns)
            dim.no_unidade_saude         AS unidade_cadastro,
            dim.nu_cnes::text            AS unidade_cadastro_cnes,
            ubi.no_distrito_sanitario    AS distrito_unidade_cadastro
        FROM tb_fat_cidadao c
        JOIN tb_dim_unidade_saude dim ON dim.co_seq_dim_unidade_saude = c.co_dim_unidade_saude
        LEFT JOIN tb_apoio_unidades_bi ubi
               ON upper(trim(ubi.no_unidade_saude)) = upper(trim(dim.no_unidade_saude))
        WHERE trim(c.nu_cns) = (SELECT cns_busca FROM parametros)
        ORDER BY c.nu_cns, c.co_seq_fat_cidadao DESC
    ),
    paciente_local AS (
        SELECT
            p.cns_busca                AS cns_paciente,
            c.no_bairro                AS no_bairro_paciente_local,
            l.co_ibge                  AS co_ibge_municipio_local
        FROM parametros p
        JOIN tb_cidadao c              ON trim(c.nu_cns) = p.cns_busca
        LEFT JOIN tb_localidade l      ON l.co_localidade = c.co_localidade_endereco
    ),
    paciente_distrito AS (
        SELECT
            pl.cns_paciente,
            pl.co_ibge_municipio_local AS co_ibge_municipio,
            pl.no_bairro_paciente_local AS no_bairro_paciente,
            bd.no_distrito_sanitario    AS distrito_paciente
        FROM paciente_local pl
        LEFT JOIN tb_bairro_x_distrito bd
               ON upper(trim(bd.no_bairro)) = upper(trim(pl.no_bairro_paciente_local))
    ),
    recomendacoes AS (
        SELECT
            u.no_unidade_saude::text      AS no_unidade,
            u.nu_cnes::text               AS no_cnes,
            u.no_distrito_sanitario::text AS no_distrito_sanitario
        FROM paciente_distrito pd
        CROSS JOIN tb_apoio_unidades_bi u
        WHERE
            -- Regra 1: paciente de outro municipio recebe apenas as UBS demanda livre
            (pd.co_ibge_municipio NOT IN ('292740','2927408')
             AND u.no_unidade_saude ilike 'UBS%')
            OR
            -- Regra 2: paciente de Salvador recebe unidades do seu distrito
            ((pd.co_ibge_municipio IN ('292740','2927408') OR pd.co_ibge_municipio IS NULL)
             AND u.no_distrito_sanitario = pd.distrito_paciente)
        ORDER BY u.no_unidade_saude ASC
    ),
    lista_unidades AS (
        SELECT string_agg(no_unidade, ', ') AS lista_nomes
        FROM recomendacoes
    ),
    unidades_elegiveis_json AS (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'nome',     no_unidade,
                    'cnes',     no_cnes,
                    'distrito', no_distrito_sanitario
                )
                ORDER BY no_unidade ASC
            ),
            '[]'::jsonb
        ) AS unidades
        FROM recomendacoes
    ),
    analise_final AS (
        SELECT
            s.status_clinico,
            v.unidade_acompanhamento,
            v.unidade_acompanhamento_cnes,
            ci.unidade_cadastro,
            ci.unidade_cadastro_cnes,
            ci.distrito_unidade_cadastro,
            l.lista_nomes,
            uej.unidades              AS unidades_elegiveis,
            pd.co_ibge_municipio,
            pd.no_bairro_paciente,
            pd.distrito_paciente
        FROM status_gestante s
        LEFT JOIN unidade_vencedora v         ON TRUE
        LEFT JOIN cadastro_individual ci      ON TRUE
        LEFT JOIN paciente_distrito pd        ON TRUE
        LEFT JOIN lista_unidades l            ON TRUE
        LEFT JOIN unidades_elegiveis_json uej ON TRUE
    )
    SELECT
        -- Coluna 1: enum estruturado consumido pelo backend
        CASE
            WHEN af.status_clinico = 'VINCULADA_PRE_NATAL'
                THEN 'VINCULADA_PRE_NATAL'
            WHEN af.co_ibge_municipio IS NOT NULL
                AND af.co_ibge_municipio NOT IN ('292740','2927408')
                THEN 'FORA_SALVADOR'
            WHEN af.unidade_cadastro IS NOT NULL
                AND af.distrito_unidade_cadastro IS NOT NULL
                AND af.distrito_unidade_cadastro = af.distrito_paciente
                THEN 'CDI_MESMO_DISTRITO'
            WHEN af.unidade_cadastro IS NOT NULL
                THEN 'CDI_OUTRO_DISTRITO'
            WHEN af.unidade_cadastro IS NULL
                THEN 'SEM_CDI'
            ELSE 'INDETERMINADO'
        END::text AS situacao_final,

        af.unidade_acompanhamento::text       AS unidade_acompanhamento_nome,
        af.unidade_acompanhamento_cnes::text  AS unidade_acompanhamento_cnes,
        af.unidade_cadastro::text             AS unidade_cadastro_nome,
        af.unidade_cadastro_cnes::text        AS unidade_cadastro_cnes,
        af.distrito_paciente::text            AS distrito_paciente,
        af.no_bairro_paciente::text           AS no_bairro_paciente,
        af.co_ibge_municipio::text            AS co_ibge_municipio,
        af.unidades_elegiveis::jsonb          AS unidades_elegiveis,

        -- Coluna 10: mensagem humana preservada para compatibilidade/log
        COALESCE(
            CASE
                WHEN af.status_clinico = 'VINCULADA_PRE_NATAL'
                    THEN 'cadastro feito você já está fazendo pré-natal na unidade de saúde '
                         || coalesce(af.unidade_acompanhamento, 'informada pelo seu médico')
                         || '. continue realizando seu acompanhamento...'
                WHEN af.co_ibge_municipio NOT IN ('292740','2927408')
                    THEN 'identificamos que você reside em outro município. as unidades de demanda livre (UBS) disponíveis em salvador são: '
                         || coalesce(af.lista_nomes, 'consulte a unidade mais próxima.')
                WHEN af.unidade_cadastro IS NOT NULL
                    AND af.distrito_unidade_cadastro = af.distrito_paciente
                    THEN 'você possui cadastro na unidade ' || af.unidade_cadastro
                         || '. você pode manter o acompanhamento nessa unidade.'
                WHEN af.unidade_cadastro IS NOT NULL
                    AND (af.distrito_unidade_cadastro != af.distrito_paciente
                         OR af.distrito_unidade_cadastro IS NULL)
                    THEN 'você possui cadastro na unidade ' || af.unidade_cadastro
                         || '. as unidades do seu distrito ('
                         || coalesce(af.distrito_paciente,
                                     'não mapeado. bairro no sistema: '
                                     || coalesce(af.no_bairro_paciente, 'sem endereço'))
                         || ') são: ' || coalesce(af.lista_nomes, 'consulte a unidade mais próxima.')
                ELSE 'não identificamos cadastro prévio. as unidades do seu distrito ('
                     || coalesce(af.distrito_paciente,
                                 'não mapeado. bairro no sistema: '
                                 || coalesce(af.no_bairro_paciente, 'sem endereço'))
                     || ') são: ' || coalesce(af.lista_nomes, 'consulte a unidade mais próxima.')
            END,
            'procure a unidade de saúde mais próxima para orientações.'
        )::text AS mensagem
    FROM analise_final af;
END;
$$;

COMMENT ON FUNCTION fn_orientacao_mae_salvador_v2(varchar) IS
  'Orientacao Mae Salvador v2. Retorno estruturado (TABLE + jsonb). '
  'Sem dependencia de geolocalizacao. Convive com a v1 (RETURNS text). '
  'Consumida por mae-salvador-core/src/cloud/adapters/EsusAdapter.ts.';

--
-- Indices recomendados (consultar DBA do e-SUS antes de criar):
--   CREATE INDEX IF NOT EXISTS ix_tb_fat_atd_ind_problemas_nu_cns
--     ON tb_fat_atd_ind_problemas (nu_cns);
--   CREATE INDEX IF NOT EXISTS ix_tb_fat_cidadao_nu_cns
--     ON tb_fat_cidadao (nu_cns);
--   CREATE INDEX IF NOT EXISTS ix_tb_cidadao_nu_cns
--     ON tb_cidadao (nu_cns);
