import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class EscolherUnidadeInput {
  @Field(() => String)
  cadastroId!: string;

  @Field(() => String)
  nomeUnidade!: string;

  @Field(() => String)
  origem!: string;
}
