import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SolicitarRecuperacaoSenhaPayload {
  @Field(() => Boolean)
  sucesso!: boolean;

  @Field(() => String)
  tokenTemporario!: string;
}
