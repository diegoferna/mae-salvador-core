import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class BuscarCpfCnsComplementarGestantePayload {
  @Field(() => String, { nullable: true })
  cpf?: string;

  @Field(() => String, { nullable: true })
  cns?: string;

  @Field(() => String, { nullable: true })
  fonte?: string;
}
