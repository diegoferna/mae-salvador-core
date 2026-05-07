import { Field, InputType } from "@nestjs/graphql";
import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

@InputType()
export class VerificarCadastroPorDadosInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  nomeCompleto!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nomeMae?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;
}
