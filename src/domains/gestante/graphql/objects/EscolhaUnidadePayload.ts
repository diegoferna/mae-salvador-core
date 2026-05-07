import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class EscolhaUnidadePayload {
  @Field(() => Boolean)
  sucesso!: boolean;

  @Field(() => String)
  unidadeId!: string;

  @Field(() => String)
  unidadeNome!: string;
}
