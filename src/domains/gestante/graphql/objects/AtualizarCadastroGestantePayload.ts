import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AtualizarCadastroGestantePayload {
  @Field(() => Boolean)
  ok!: boolean;

  @Field(() => String)
  cadastroId!: string;

  @Field(() => String)
  mensagem!: string;
}
