import { Field, ObjectType } from "@nestjs/graphql";
import { CidadaoCnsObject } from "./CidadaoCnsObject";

@ObjectType()
export class BuscarCnsPayload {
  @Field(() => Boolean)
  sucesso!: boolean;

  @Field(() => String, { nullable: true })
  fonte?: string;

  @Field(() => CidadaoCnsObject, { nullable: true })
  cidadao?: CidadaoCnsObject;

  @Field(() => [String], { nullable: true })
  fontesIndisponiveis?: string[];
}
