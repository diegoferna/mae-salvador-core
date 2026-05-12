import { Field, ObjectType } from "@nestjs/graphql";
import { UnidadePosAtualizacaoOpcaoObject } from "./UnidadePosAtualizacaoOpcaoObject";

@ObjectType()
export class AvaliarUnidadePosAtualizacaoPayload {
  @Field(() => String)
  cenario!: string;

  @Field(() => String)
  situacaoFinal!: string;

  @Field(() => String)
  mensagem!: string;

  @Field(() => Boolean)
  exigeEscolha!: boolean;

  @Field(() => String, { nullable: true })
  unidadeAtualNome?: string;

  @Field(() => String, { nullable: true })
  unidadeAtualCnes?: string;

  @Field(() => [UnidadePosAtualizacaoOpcaoObject], { nullable: true })
  opcoes?: UnidadePosAtualizacaoOpcaoObject[];
}
