import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { PrismaService } from "../prisma/PrismaService";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gql = GqlExecutionContext.create(context).getContext<{
      auth?: { sub: string };
    }>();

    if (!gql.auth?.sub) {
      throw new ForbiddenException("missing_user_context");
    }

    const papeis = await this.prisma.$queryRaw<Array<{ papel: string; escopo: string }>>`
      SELECT
        up.papel::text AS papel,
        up.escopo::text AS escopo
      FROM usuario_papel up
      WHERE up.usuario_id = ${gql.auth.sub}::uuid
    `;

    const possuiEscopoInvalido = papeis.some((papel: { papel: string; escopo: string }) => {
      if (papel.papel === "gerente_unidade") return !papel.escopo?.trim();
      if (papel.papel === "gerente_distrito") return !papel.escopo?.trim();
      return false;
    });

    if (possuiEscopoInvalido) {
      throw new ForbiddenException("invalid_role_scope");
    }

    return true;
  }
}
