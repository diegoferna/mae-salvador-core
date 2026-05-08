import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AtualizacaoCadastralGestanteObject {
  @Field(() => String)
  cadastroId!: string;

  @Field(() => String, { nullable: true })
  cpf?: string;

  @Field(() => String, { nullable: true })
  cns?: string;

  @Field(() => String, { nullable: true })
  nomeCompleto?: string;

  @Field(() => String, { nullable: true })
  nomeSocial?: string;

  @Field(() => String, { nullable: true })
  nomeMae?: string;

  @Field(() => String, { nullable: true })
  nomePai?: string;

  @Field(() => String, { nullable: true })
  dataNascimento?: string;

  @Field(() => String, { nullable: true })
  racaCor?: string;

  @Field(() => String, { nullable: true })
  sexo?: string;

  @Field(() => String, { nullable: true })
  identidadeGenero?: string;

  @Field(() => String, { nullable: true })
  orientacaoSexual?: string;

  @Field(() => Boolean, { nullable: true })
  possuiDeficiencia?: boolean;

  @Field(() => [String], { nullable: true })
  deficiencias?: string[];

  @Field(() => String, { nullable: true })
  dddCelularPrincipal?: string;

  @Field(() => String, { nullable: true })
  celularPrincipal?: string;

  @Field(() => Boolean, { nullable: true })
  celularPrincipalWhatsapp?: boolean;

  @Field(() => String, { nullable: true })
  dddCelularAlternativo?: string;

  @Field(() => String, { nullable: true })
  celularAlternativo?: string;

  @Field(() => Boolean, { nullable: true })
  celularAlternativoWhatsapp?: boolean;

  @Field(() => String, { nullable: true })
  dddResidencial?: string;

  @Field(() => String, { nullable: true })
  telefoneResidencial?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  cep?: string;

  @Field(() => String, { nullable: true })
  municipio?: string;

  @Field(() => String, { nullable: true })
  tipoLogradouro?: string;

  @Field(() => String, { nullable: true })
  logradouro?: string;

  @Field(() => String, { nullable: true })
  bairro?: string;

  @Field(() => String, { nullable: true })
  numero?: string;

  @Field(() => String, { nullable: true })
  complemento?: string;

  @Field(() => String, { nullable: true })
  pontoReferencia?: string;

  @Field(() => [String], { nullable: true })
  programasSociais?: string[];

  @Field(() => String, { nullable: true })
  nis?: string;

  @Field(() => Boolean, { nullable: true })
  planoSaudeParticular?: boolean;

  @Field(() => Boolean, { nullable: true })
  alergiasConhecidas?: boolean;

  @Field(() => Boolean, { nullable: true })
  medicamentosEmUso?: boolean;

  @Field(() => Boolean, { nullable: true })
  doencasPreexistentes?: boolean;
}
