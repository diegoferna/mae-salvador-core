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
}
