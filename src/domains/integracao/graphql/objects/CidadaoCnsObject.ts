import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CidadaoCnsObject {
  @Field(() => String, { nullable: true })
  cpf?: string;

  @Field(() => String)
  cns!: string;

  @Field(() => String)
  nome!: string;

  @Field(() => String, { nullable: true })
  nomeSocial?: string;

  @Field(() => String, { nullable: true })
  nomeMae?: string;

  @Field(() => String, { nullable: true })
  nomePai?: string;

  @Field(() => String, { nullable: true })
  dataNascimento?: string;

  @Field(() => String, { nullable: true })
  sexo?: string;

  @Field(() => String, { nullable: true })
  racaCor?: string;

  @Field(() => String, { nullable: true })
  identidadeGenero?: string;

  @Field(() => String, { nullable: true })
  orientacaoSexual?: string;

  @Field(() => String, { nullable: true })
  logradouro?: string;

  @Field(() => String, { nullable: true })
  tipoLogradouro?: string;

  @Field(() => String, { nullable: true })
  numero?: string;

  @Field(() => String, { nullable: true })
  complemento?: string;

  @Field(() => String, { nullable: true })
  bairro?: string;

  @Field(() => String, { nullable: true })
  cep?: string;

  @Field(() => String, { nullable: true })
  municipio?: string;

  @Field(() => String, { nullable: true })
  emails?: string;

  @Field(() => String, { nullable: true })
  ddd?: string;

  @Field(() => String, { nullable: true })
  telefoneCelular?: string;

  @Field(() => String, { nullable: true })
  telefoneResidencial?: string;
}
