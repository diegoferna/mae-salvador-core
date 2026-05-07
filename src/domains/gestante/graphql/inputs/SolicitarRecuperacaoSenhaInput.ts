import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class SolicitarRecuperacaoSenhaInput {
  @Field(() => String)
  cpfCns!: string;
}
