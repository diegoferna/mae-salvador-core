import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class VerificarCadastroPorDadosPayload {
  @Field(() => Boolean)
  existe!: boolean;
}
