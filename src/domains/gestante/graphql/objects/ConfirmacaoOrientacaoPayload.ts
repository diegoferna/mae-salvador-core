import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ConfirmacaoOrientacaoPayload {
  @Field(() => String)
  mensagem!: string;
}
