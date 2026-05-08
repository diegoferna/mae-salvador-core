import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UnidadePosAtualizacaoOpcaoObject {
  @Field(() => String)
  nome!: string;

  @Field(() => String)
  distanciaKm!: string;

  @Field(() => String)
  origem!: string;
}
