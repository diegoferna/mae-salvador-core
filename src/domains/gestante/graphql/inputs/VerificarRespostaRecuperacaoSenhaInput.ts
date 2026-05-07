import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString } from "class-validator";

@InputType()
export class VerificarRespostaRecuperacaoSenhaInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  cpfCns!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  opcaoId!: string;
}
