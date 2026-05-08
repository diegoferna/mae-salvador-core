import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";

@InputType()
export class AtualizarCadastroGestanteInput {
  @Field(() => String)
  @IsString()
  cadastroId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cpf?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cns?: string;

  @Field(() => String)
  @IsString()
  nomeCompleto!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nomeSocial?: string;

  @Field(() => String)
  @IsString()
  nomeMae!: string;

  @Field(() => String)
  @IsString()
  nomePai!: string;

  @Field(() => String)
  @IsString()
  dataNascimento!: string;

  @Field(() => String)
  @IsString()
  racaCor!: string;

  @Field(() => String)
  @IsString()
  sexo!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  identidadeGenero?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  orientacaoSexual?: string;

  @Field(() => Boolean)
  @IsBoolean()
  possuiDeficiencia!: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deficiencias?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dddCelularPrincipal?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  celularPrincipal?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  celularPrincipalWhatsapp?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dddCelularAlternativo?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  celularAlternativo?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  celularAlternativoWhatsapp?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dddResidencial?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  telefoneResidencial?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String)
  @IsString()
  cep!: string;

  @Field(() => String)
  @IsString()
  municipio!: string;

  @Field(() => String)
  @IsString()
  tipoLogradouro!: string;

  @Field(() => String)
  @IsString()
  logradouro!: string;

  @Field(() => String)
  @IsString()
  bairro!: string;

  @Field(() => String)
  @IsString()
  numero!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  complemento?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  pontoReferencia?: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  programasSociais!: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nis?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  planoSaudeParticular?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  alergiasConhecidas?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  medicamentosEmUso?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  doencasPreexistentes?: boolean;
}
