import { Field, ObjectType } from "@nestjs/graphql";
import { UnidadePosAtualizacaoOpcaoObject } from "./UnidadePosAtualizacaoOpcaoObject";

@ObjectType()
export class AvaliarUnidadePosAtualizacaoPayload {
  @Field(() => String)
  cenario!: string;

  @Field(() => String)
  mensagem!: string;

  @Field(() => String, { nullable: true })
  unidadeAtualNome?: string;

  @Field(() => [UnidadePosAtualizacaoOpcaoObject], { nullable: true })
  opcoes?: UnidadePosAtualizacaoOpcaoObject[];
}
