import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PerguntaSegurancaOpcaoObject {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  texto!: string;
}
