import { Field, ObjectType } from "@nestjs/graphql";
import { OrientacaoUnidadeOpcaoObject } from "./OrientacaoUnidadeOpcaoObject";

@ObjectType()
export class OrientacaoMaeSalvadorPayload {
  @Field(() => String)
  situacaoFinal!: string;

  @Field(() => String, { nullable: true })
  unidadeAcompanhamentoNome?: string;

  @Field(() => String, { nullable: true })
  unidadeAcompanhamentoCnes?: string;

  @Field(() => String, { nullable: true })
  unidadeCadastroNome?: string;

  @Field(() => String, { nullable: true })
  unidadeCadastroCnes?: string;

  @Field(() => String, { nullable: true })
  distritoPaciente?: string;

  @Field(() => String, { nullable: true })
  bairroPaciente?: string;

  @Field(() => String, { nullable: true })
  coIbgeMunicipio?: string;

  @Field(() => [OrientacaoUnidadeOpcaoObject])
  unidadesElegiveis!: OrientacaoUnidadeOpcaoObject[];

  @Field(() => String)
  mensagem!: string;

  @Field(() => Boolean)
  exigeEscolha!: boolean;
}
