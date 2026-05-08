import { Field, InputType } from "@nestjs/graphql";
import { IsString } from "class-validator";

@InputType()
export class ConfirmarEscolhaUnidadePosAtualizacaoInput {
  @Field(() => String)
  @IsString()
  cadastroId!: string;

  @Field(() => String)
  @IsString()
  nomeUnidade!: string;

  @Field(() => String)
  @IsString()
  origem!: string;
}
