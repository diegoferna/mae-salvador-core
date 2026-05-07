import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { JwtService } from "../auth/JwtService";

@Injectable()
export class IsAuthenticatedGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlCtx = GqlExecutionContext.create(context).getContext<{ req?: { headers?: Record<string, string> } }>();
    const authHeader = gqlCtx.req?.headers?.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      throw new UnauthorizedException("missing_token");
    }

    try {
      const payload = await this.jwtService.verify(token);
      (gqlCtx as { auth?: { sub: string; iss: string } }).auth = payload;
      return true;
    } catch {
      throw new UnauthorizedException("invalid_token");
    }
  }
}
