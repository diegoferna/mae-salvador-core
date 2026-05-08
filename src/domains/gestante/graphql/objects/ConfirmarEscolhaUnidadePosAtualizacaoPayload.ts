import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ConfirmarEscolhaUnidadePosAtualizacaoPayload {
  @Field(() => Boolean)
  sucesso!: boolean;

  @Field(() => String)
  unidadeNome!: string;
}
