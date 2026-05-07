import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LoginGestantePayload {
  @Field(() => String)
  token!: string;

  @Field(() => String)
  usuarioId!: string;

  @Field(() => String)
  nome!: string;
}
