import { Field, InputType } from "@nestjs/graphql";
import { IsString } from "class-validator";

@InputType()
export class ObterAtualizacaoCadastralGestanteInput {
  @Field(() => String)
  @IsString()
  cadastroId!: string;
}
