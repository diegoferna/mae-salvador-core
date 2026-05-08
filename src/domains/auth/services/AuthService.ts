import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "../../../core/auth/JwtService";
import { PrismaService } from "../../../core/prisma/PrismaService";
import { LoginGestanteInput } from "../graphql/inputs/LoginGestanteInput";
import { PasswordService } from "./PasswordService";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async loginGestante(input: LoginGestanteInput) {
    if (!input.cpfCns || !input.senha) {
      throw new BadRequestException("cpf_cns_and_password_required");
    }
    const documento = input.cpfCns.replace(/\D/g, "");
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        tipo: "gestante",
        OR: [{ cpf: documento }, { cns: documento }],
      },
      select: {
        id: true,
        senhaHash: true,
        status: true,
        gestante: {
          select: {
            id: true,
            pessoa: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

    if (!usuario?.senhaHash || usuario.status !== "ativo") {
      throw new UnauthorizedException("invalid_credentials");
    }

    const valido = await this.passwordService.verify(
      input.senha,
      usuario.senhaHash,
    );
    if (!valido) {
      throw new UnauthorizedException("invalid_credentials");
    }

    const token = await this.jwtService.sign(usuario.id, "gestante");
    if (!usuario.gestante?.id) {
      throw new UnauthorizedException("invalid_credentials");
    }
    return {
      token,
      usuarioId: usuario.id,
      cadastroId: usuario.gestante.id,
      nome: usuario.gestante?.pessoa?.nome ?? "",
    };
  }
}
