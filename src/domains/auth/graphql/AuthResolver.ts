import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { AuthService } from "../services/AuthService";
import { LoginGestanteInput } from "./inputs/LoginGestanteInput";
import { LoginGestantePayload } from "./objects/LoginGestantePayload";

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => LoginGestantePayload)
  loginGestante(
    @Args("input", { type: () => LoginGestanteInput })
    input: LoginGestanteInput,
  ): Promise<LoginGestantePayload> {
    console.log("loginGestante", input);
    return this.authService.loginGestante(input);
  }
}
