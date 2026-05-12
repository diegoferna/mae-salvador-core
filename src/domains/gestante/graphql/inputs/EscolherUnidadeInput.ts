import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

@InputType()
export class EscolherUnidadeInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  cadastroId!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  nomeUnidade!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cnes?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  origem!: string;
}
