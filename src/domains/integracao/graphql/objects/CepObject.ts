import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CepObject {
  @Field(() => String)
  cep!: string;

  @Field(() => String)
  logradouro!: string;

  @Field(() => String)
  bairro!: string;

  @Field(() => String, { nullable: true })
  tipoLogradouro?: string;

  @Field(() => String, { nullable: true })
  localidade?: string;

  @Field(() => String, { nullable: true })
  uf?: string;
}
