import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString, Length } from "class-validator";

@InputType()
export class RedefinirSenhaGestanteInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  token!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @Length(6, 15)
  novaSenha!: string;
}
