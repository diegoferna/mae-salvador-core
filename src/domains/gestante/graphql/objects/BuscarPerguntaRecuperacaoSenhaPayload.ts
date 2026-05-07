import { Field, Int, ObjectType } from "@nestjs/graphql";
import { PerguntaSegurancaOpcaoObject } from "./PerguntaSegurancaOpcaoObject";

@ObjectType()
export class BuscarPerguntaRecuperacaoSenhaPayload {
  @Field(() => String)
  pergunta!: string;

  @Field(() => [PerguntaSegurancaOpcaoObject])
  opcoes!: PerguntaSegurancaOpcaoObject[];

  @Field(() => Int)
  tentativasRestantes!: number;
}
