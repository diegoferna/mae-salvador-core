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

    const papeis = await this.prisma.usuarioPapel.findMany({
      where: { usuarioId: gql.auth.sub, ativo: true },
      select: { papel: true, ubsId: true, distritoId: true },
    });

    const possuiEscopoInvalido = papeis.some((papel) => {
      if (papel.papel === "gerente_unidade") return !papel.ubsId;
      if (papel.papel === "gerente_distrito") return !papel.distritoId;
      return false;
    });

    if (possuiEscopoInvalido) {
      throw new ForbiddenException("invalid_role_scope");
    }

    return true;
  }
}
