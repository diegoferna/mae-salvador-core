import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

@InputType()
export class CadastrarGestanteInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cpf?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cns?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @Field(() => String)
  @IsString()
  @Length(6, 15)
  senha!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nis?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  origemCadastro!: string;
}
