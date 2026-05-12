import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class OrientacaoUnidadeOpcaoObject {
  @Field(() => String)
  nome!: string;

  @Field(() => String, { nullable: true })
  cnes?: string;

  @Field(() => String, { nullable: true })
  distrito?: string;
}
