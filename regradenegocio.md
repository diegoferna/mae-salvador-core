1. Modelagem de dados (base atual)
   1.1 Bancos e responsabilidade
   APP_DATABASE_URL: domínio principal da aplicação (usuários, gestantes, cadastros, RBAC, sessões).
   ESUS_DATABASE_URL: função `fn_orientacao_mae_salvador_v2(cns)` que retorna a orientação estruturada (situação, unidades elegíveis, mensagem) consumida pelo backend. Convive em paralelo com a `fn_orientacao_mae_salvador(cns)` legada (RETURNS text), que segue intacta para sistemas externos. Não há mais persistência de GPS/coordenadas — toda lógica de distância foi removida.
   1.2 Entidades/tabelas — APP_DATABASE_URL
   Catálogos de domínio
   identidade_genero (id, codigo UNIQUE, label, ordem)
   orientacao_sexual (id, codigo UNIQUE, label, ordem)
   distrito_sanitario (id, codigo UNIQUE, nome, numero)
   descobrimento_gestacao (id, codigo UNIQUE, label, ordem)
   programa_social (id, codigo UNIQUE, label, ordem)
   plano_saude_opcao (id, codigo UNIQUE, label)
   Estrutura assistencial
   ubs
   Principais campos: codigo UNIQUE, nome, cnes, tipo (USF|UBS), distrito_sanitario_id FK
   Identidade e pessoas
   usuario
   Principais campos: tipo (gestante|profissional|gestor), cpf, cns, senha_hash, status (ativo|inativo|bloqueado|pendente)
   Regra: ao menos um entre CPF/CNS não vazio
   Unicidade funcional parcial de CPF e CNS normalizados
   pessoa
   Principais campos: nome, nome social, filiação, nascimento, sexo, raça/cor, deficiência, identidade_genero_id FK, orientacao_sexual_id FK
   contato
   Principais campos: pessoa_id FK, tipo (telefone_celular|telefone_residencial|email), valor, whatsapp, principal
   endereco
   Principais campos: pessoa_id FK, CEP/logradouro/número/bairro, distrito_sanitario_id FK
   Domínio gestante
   gestante
   Principais campos: usuario_id UNIQUE FK, pessoa_id UNIQUE FK, origem_cadastro (manual|cip), IDs externos (id_cidadao_cip, co_cidadao_esus), status (pendente|aprovado|recusado), cartao_mae_salvador
   gestante_clinico (1:1 com gestante, PK=FK)
   Principais campos: descobrimento_gestacao_id FK, DUM, plano saúde, antecedentes obstétricos
   gestante_vinculo (1:1 com gestante, PK=FK)
   Principais campos: ubs_id FK
   gestante_unidade_escolha
   Principais campos: gestante_id FK, ubs_id FK, unidade_escolhida_nome, unidade_escolhida_origem
   Valores semânticos atuais de unidade_escolhida_origem (novos):
   - cadastro_individual: unidade vinda do CDI (cadastro individual do paciente no e-SUS).
   - distrito: unidade recomendada pelo distrito sanitário do paciente.
   - ubs_municipio: unidade disponível para pacientes fora de Salvador (cenário FORA_SALVADOR).
   - acompanhamento_pre_natal: paciente optou por permanecer na unidade já vinculada ao pré-natal.
   Valores legados (cdi, proxima) ainda podem aparecer em registros históricos; o serviço normaliza
   automaticamente cdi->cadastro_individual e proxima->distrito ao gravar novas escolhas.
   gestante_programa_social (N:N)
   PK composta: (gestante_id, programa_social_id)
   Campo adicional: nis
   Segurança e acesso
   sessao
   Principais campos: usuario_id FK, token_hash UNIQUE, refresh_hash, origem, expiração/revogação
   usuario_papel
   Principais campos: usuario_id FK, papel, ubs_id, distrito_id, ativo
   Papéis: gestante, profissional_saude, gerente_unidade, gerente_distrito, gestor_sms, administrador_sistema
   Check de escopo obrigatório por papel (ver seção de autorização)
   auditoria_autenticacao
   Principais campos: usuário, identificador, evento, sucesso, IP, user-agent, detalhe
   gestante_esqueceu_senha_tentativas
   Principais campos: cpf_cns (PK), contador de tentativas, bloqueio temporal
   1.3 Entidades/tabelas — ESUS_DATABASE_URL
   Funções SQL:
   fn_orientacao_mae_salvador_v2(p_cns_paciente varchar) RETURNS TABLE
     Colunas: situacao_final, unidade_acompanhamento_nome, unidade_acompanhamento_cnes,
              unidade_cadastro_nome, unidade_cadastro_cnes, distrito_paciente,
              no_bairro_paciente, co_ibge_municipio, unidades_elegiveis (jsonb), mensagem.
     unidades_elegiveis é um array de objetos { nome, cnes, distrito }.
     situacao_final ∈ {VINCULADA_PRE_NATAL, CDI_MESMO_DISTRITO, CDI_OUTRO_DISTRITO,
                       SEM_CDI, FORA_SALVADOR, INDETERMINADO}.
   Definição versionada em docs/sql/fn_orientacao_mae_salvador_v2.sql.
   A v1 (`fn_orientacao_mae_salvador(varchar) RETURNS text`) NÃO foi alterada e
   permanece no banco para sistemas legados. Removidos: as overloads anteriores
   com lat/lon, as tabelas apoio_cnes_gps e apoio_paciente_gps deixaram de ser
   usadas pela aplicação (não há mais GPS persistido).
   1.4 Relacionamentos principais
   distrito_sanitario 1:N ubs
   usuario 1:1 gestante
   pessoa 1:1 gestante
   gestante 1:1 gestante_clinico
   gestante 1:1 gestante_vinculo
   gestante 1:N gestante_unidade_escolha
   gestante N:N programa_social via gestante_programa_social
   usuario 1:N sessao
   usuario 1:N usuario_papel
   usuario 1:N auditoria_autenticacao
   pessoa 1:N contato e 1:N endereco
   1.5 Constraints/regras implícitas de banco
   Unicidade de identificadores de catálogo por codigo.
   Check de domínio textual em vários campos (status, tipo, papel, etc.).
   Unicidade funcional de CPF/CNS normalizados em usuario.
   Escopo de papel validado por constraint em usuario_papel.
   FKs com ON DELETE CASCADE onde há composição forte (contato, endereco, gestante_clinico, gestante_vinculo, etc.).
   Pontos de atenção implícitos:
   Não há trigger automática para manter atualizado_em.
   Não há constraint para “um único contato principal”.
   Não há check numérico para impedir contadores negativos em gestante_clinico.
2. Regras de negócio
   2.1 Regras de identificação e cadastro
   Usuário deve possuir CPF ou CNS (um dos dois).
   CPF/CNS são tratados com normalização de formato para evitar duplicidade.
   Cadastro de gestante bloqueia duplicidade por CPF/CNS já cadastrados.
   Senha obrigatória no cadastro com política de tamanho (6–15).
   Em programas sociais, há regra condicional: Bolsa Família exige NIS válido (11 dígitos).
   2.2 Regras clínicas/socioeconômicas
   Cadastro exige dados pessoais, contato principal e endereço mínimo.
   Dados obstétricos possuem validação de consistência (ex.: DUM dentro de janela aceitável no fluxo da API).
   Origem de cadastro da gestante é controlada (manual ou cip).
   2.3 Regras de login e sessão (estado atual)
   Login de gestante é real: valida documento + senha hash.
   Login de profissional/gestão no dashboard está mockado no front (sem autenticação backend real).
   Parte da sessão da gestante no portal está em sessionStorage no cliente (não JWT assinado no backend).
   2.4 Regras de recuperação de senha
   Fluxo em duas etapas:
   desafio com pergunta/opções;
   redefinição com token temporário.
   Limite de tentativas por CPF/CNS e bloqueio temporário.
   Controle híbrido:
   contador/bloqueio persistidos em tabela;
   desafio/token temporário em memória de processo (volátil).
   2.5 Regras de criação/edição/exclusão
   Criação de gestante ocorre de forma transacional em múltiplas tabelas.
   Escolha de unidade:
   valida cadastro existente;
   tenta resolver UBS por nome;
   atualiza vínculo atual e grava histórico de escolha.
   Excluir gestante não aparece como fluxo explícito de API; modelo usa cascatas em entidades filhas.
   2.6 Regras condicionais
   Só permite confirmação de orientação com cns ou cadastroId válido.
   Não há mais entrada de latitude/longitude no fluxo de orientação — a função SQL é
   determinística por CNS e devolve a situação clínica/territorial estruturada.
   Escopo de papel:
   gerente_unidade exige ubs_id;
   gerente_distrito exige distrito_id;
   gestor_sms/administrador_sistema sem escopo local.
3. Fluxos principais do sistema
   3.1 Login/autenticação
   3.1.1 Gestante (real)
   Entrada: cpfCns, senha
   Processamento:
   normaliza documento;
   busca usuário gestante + pessoa;
   valida hash de senha.
   Saída:
   sucesso: dados básicos da gestante;
   falha: 401 (não encontrado/sem senha/senha inválida), 400, 500.
   Regras aplicadas: documento obrigatório, senha obrigatória, tipo de usuário gestante.
   3.1.2 Profissional/gestor (atual)
   Entrada: credenciais no front.
   Processamento: validação simulada em contexto de autenticação client-side.
   Saída: estado local autenticado e renderização de menu por papel.
   Regras aplicadas: apenas regras de interface, sem enforcement backend.
   3.2 Cadastro de usuários (foco gestante)
   Entrada: payload completo (identificação, contato, endereço, clínico, programas sociais, senha).
   Processamento:
   validação Zod;
   checagem de duplicidade CPF/CNS;
   hash de senha;
   persistência transacional (usuario, pessoa, gestante, clínicas/relacionais).
   Saída: { ok: true, id } ou erro (400, 409, 500, 503 sem DB).
   Regras aplicadas: obrigatoriedades por domínio, formatos, condicionais (NIS).
   3.3 Gestão de “condomínios” (mapeamento)
   Não há conceito de condomínio no sistema atual.
   O escopo operacional implementado é territorial/assistencial via:
   UBS
   Distrito Sanitário
   Papéis com escopo em usuario_papel.
   3.4 Permissões/acesso
   Modelo de dados: RBAC com escopo (usuario_papel).
   Aplicação atual:
   enforcement forte no banco (constraint de escopo);
   enforcement fraco na camada Next (sem middleware global robusto de autorização backend).
   Saída prática:
   menu e acesso visual no front;
   sem garantia completa server-side para todas as ações.
   3.5 Fluxos relevantes adicionais
   Busca de CNS (por documento e por dados)
   Entrada: CPF/CNS ou nome+dados.
   Processamento: consulta e-SUS; fallback SOAP CadSUS.
   Saída: envelope de sucesso/fracasso + cidadão encontrado + fontes indisponíveis.
   Busca de CEP
   Entrada: CEP.
   Processamento: consulta base e-SUS.
   Saída: endereço normalizado ou 404.
   Confirmação/orientação da gestante
   Entrada: cns ou cadastroId.
   Processamento:
   resolve CNS (busca direta, fallback via integração CNS por CPF);
   executa fn_orientacao_mae_salvador_v2(cns) no banco e-SUS;
   mapeia o retorno tipado para OrientacaoMaeSalvadorPayload no GraphQL.
   Saída: payload estruturado com situacaoFinal, mensagem, unidadesElegiveis (array)
          e flags exigeEscolha (true para CDI_OUTRO_DISTRITO, SEM_CDI e FORA_SALVADOR).
   A UI é dirigida pelo enum situacaoFinal — não há parsing de texto.
   Escolha de unidade
   Entrada: cadastroId, nomeUnidade, cnes (opcional, preferencial), origem (enum semântico).
   Processamento: resolve UBS por CNES (preferencial) com fallback nome, atualiza vínculo
                  e grava histórico em gestante_unidade_escolha com origem semântica.
   Saída: confirmação com dados da unidade resolvida.
4. Contratos da API atual (Next.js)
   4.1 Endpoints existentes
   GET /api/cns/buscar
   GET /api/cns/buscar-por-dados
   GET /api/cep/buscar
   POST /api/gestante/cadastrar
   GET /api/gestante/verificar
   POST /api/gestante/verificar
   POST /api/gestante/login
   GET /api/gestante/esqueceu-senha
   POST /api/gestante/esqueceu-senha
   GET /api/gestante/programas-sociais
   GET /api/gestante/confirmacao
   POST /api/gestante/escolha-unidade
   4.2 Inputs/outputs e erros (padrão observado)
   Validação: predominantemente Zod + normalização manual.
   Saídas:
   padrão de sucesso com ok/sucesso, payload de domínio;
   mensagens de negócio em casos previstos.
   Erros HTTP frequentes:
   400 validação/parâmetro inválido
   401 autenticação inválida (login gestante)
   404 recurso não localizado
   409 conflito de cadastro existente
   429 limite de tentativas (esqueceu senha)
   500 erro interno
   503 dependência de banco indisponível/configuração ausente
5. Dependências e integrações
   PostgreSQL (APP): persistência principal do domínio.
   PostgreSQL (e-SUS): CEP e função fn_orientacao_mae_salvador_v2 (orientação clínica/territorial estruturada).
   SOAP CNS Federal (CadSUS): fallback/consulta de cidadão.
   Criptografia de senha: hash/verificação local na aplicação.
   Acoplamentos importantes:
   lógica de confirmação depende inteiramente da função SQL do e-SUS (retorno estruturado);
   fluxo de busca CNS depende da disponibilidade de duas fontes externas;
   recuperação de senha depende parcialmente de estado em memória.
   Removido: Nominatim (geocodificação) — não há mais qualquer dependência de
   geolocalização no pipeline de orientação da gestante.
6. Regras de autorização
   6.1 Perfis de usuário
   Modelados no banco por usuario_papel.papel:
   gestante
   profissional_saude
   gerente_unidade
   gerente_distrito
   gestor_sms
   administrador_sistema
   Campo usuario.tipo (gestante/profissional/gestor) coexistente, sem regra forte de coerência entre tipo e papel.
   6.2 Permissões por ação (estado real)
   Implementado plenamente: autenticação de gestante em endpoint próprio.
   Parcial/ausente:
   profissional/gestor sem auth backend consolidada;
   autorização server-side transversal não centralizada (sem middleware global robusto).
   6.3 Restrições por contexto
   Contexto implementado: UBS e distrito sanitário.
   Regra no banco (constraint):
   gerente_unidade -> precisa ubs_id.
   gerente_distrito -> precisa distrito_id.
   gestor_sms e administrador_sistema -> sem ubs_id/distrito_id.
   Condomínio: não existe como contexto no modelo atual.
7. Pontos críticos do sistema (não quebrar)
   Unicidade/normalização de CPF e CNS no cadastro.
   Integridade relacional da cadeia usuario -> gestante -> dados clínicos/vínculos.
   Semântica de status de usuario e gestante.
   Regras de escopo de usuario_papel no banco.
   Fluxo de confirmação que depende da função fn_orientacao_mae_salvador_v2.
   Limite de tentativas no esqueceu-senha (segurança operacional).
   Compatibilidade com catálogos (codigo estável) usados por UI/integrações.
   7.1 Comportamentos sensíveis
   Recuperação de senha com estado em memória (risco em ambiente distribuído/restart).
   Autorização de profissionais/gestão ainda majoritariamente client-side.
   Dependência de serviços externos (SOAP/Nominatim) impactando disponibilidade.
   Ausência de triggers para atualizado_em pode gerar inconsistência temporal.
   Possibilidade de múltiplos contatos “principais” por falta de constraint específica.
8. Diretrizes de reimplementação (NestJS) mantendo o banco
   Preservar integralmente contratos de dados e regras condicionais atuais antes de evoluir.
   Centralizar autenticação/autorização no backend (guards + RBAC + escopo UBS/distrito).
   Manter endpoints compatíveis inicialmente (mesmos códigos e envelopes), com versionamento para mudanças futuras.
   Isolar integrações externas por adaptadores (e-SUS PG, SOAP CadSUS), com timeout/circuit-breaker.
   Migrar fluxo de reset de senha para armazenamento distribuído e auditável (eliminar estado volátil em memória).
