import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class ConfirmarOrientacaoInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cns?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cadastroId?: string;
}
