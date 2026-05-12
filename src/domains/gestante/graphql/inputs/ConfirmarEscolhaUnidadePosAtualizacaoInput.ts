import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class ConfirmarEscolhaUnidadePosAtualizacaoInput {
  @Field(() => String)
  @IsString()
  cadastroId!: string;

  @Field(() => String)
  @IsString()
  nomeUnidade!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cnes?: string;

  @Field(() => String)
  @IsString()
  origem!: string;
}
