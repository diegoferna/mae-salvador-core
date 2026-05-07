import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CadastroGestantePayload {
  @Field(() => Boolean)
  ok!: boolean;

  @Field(() => String)
  id!: string;
}
