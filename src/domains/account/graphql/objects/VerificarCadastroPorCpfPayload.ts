import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class VerificarCadastroPorCpfPayload {
  @Field(() => Boolean)
  existe!: boolean;
}
