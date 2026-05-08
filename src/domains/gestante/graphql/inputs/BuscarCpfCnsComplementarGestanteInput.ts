import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class BuscarCpfCnsComplementarGestanteInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cpf?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cns?: string;
}
