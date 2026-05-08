import { Field, Float, InputType } from "@nestjs/graphql";
import { IsNumber, IsOptional, IsString } from "class-validator";

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

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
