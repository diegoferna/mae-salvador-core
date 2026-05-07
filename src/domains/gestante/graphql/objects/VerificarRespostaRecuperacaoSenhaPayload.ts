import { Field, Int, ObjectType } from "@nestjs/graphql";
import { PerguntaSegurancaOpcaoObject } from "./PerguntaSegurancaOpcaoObject";

@ObjectType()
export class VerificarRespostaRecuperacaoSenhaPayload {
  @Field(() => Boolean)
  ok!: boolean;

  @Field(() => String, { nullable: true })
  erro?: string;

  @Field(() => String, { nullable: true })
  token?: string;

  @Field(() => Int, { nullable: true })
  tentativasRestantes?: number;

  @Field(() => Boolean, { nullable: true })
  proximaPergunta?: boolean;

  @Field(() => String, { nullable: true })
  pergunta?: string;

  @Field(() => [PerguntaSegurancaOpcaoObject], { nullable: true })
  opcoes?: PerguntaSegurancaOpcaoObject[];
}
