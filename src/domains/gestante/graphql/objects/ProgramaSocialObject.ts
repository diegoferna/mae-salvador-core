import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ProgramaSocialObject {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  codigo!: string;

  @Field(() => String)
  label!: string;
}
