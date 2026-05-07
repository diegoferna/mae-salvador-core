import { Field, Float, InputType } from "@nestjs/graphql";

@InputType()
export class ConfirmarOrientacaoInput {
  @Field(() => String, { nullable: true })
  cns?: string;

  @Field(() => String, { nullable: true })
  cadastroId?: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;
}
