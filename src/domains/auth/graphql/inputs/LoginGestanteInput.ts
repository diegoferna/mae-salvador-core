import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString, Length } from "class-validator";

@InputType()
export class LoginGestanteInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  cpfCns!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @Length(6, 15)
  senha!: string;
}
