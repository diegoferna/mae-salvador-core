import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

@InputType()
export class CadastrarGestanteInput {
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
  @IsNotEmpty()
  nome!: string;

  @Field(() => String)
  @IsString()
  @Length(6, 15)
  senha!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nis?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  origemCadastro!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nomeSocial?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  nomeSocialPrincipal?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nomeMae?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nomePai?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dataNascimento?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sexo?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  racaCor?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  possuiDeficiencia?: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsString({ each: true })
  deficienciaTipos?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  identidadeGenero?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  orientacaoSexual?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ddd?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  celularPrincipal?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  temWhatsapp?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dddAlternativo?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  celularAlternativo?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  temWhatsappAlternativo?: boolean;

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
  @IsString()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  tipoLogradouro?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  logradouro?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  numero?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  complemento?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bairro?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cep?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  municipio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  pontoReferencia?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  distritoId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  descobrimento?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsString({ each: true })
  programaSocial?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  planoSaude?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  manterAcompanhamentoUbs?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dum?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  gestacoesPrevias?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  partosCesareo?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  partosNormal?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  abortos?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  alergias?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  doencasConhecidas?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  medicacoesEmUso?: string;
}
