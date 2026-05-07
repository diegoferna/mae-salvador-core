import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString } from "class-validator";

@InputType()
export class BuscarCepInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  cep!: string;
}
