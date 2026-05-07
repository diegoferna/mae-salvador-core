import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/PrismaService";

@Injectable()
export class UnidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolverPorNome(nome: string) {
    const ubs = await this.prisma.ubs.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" } },
      select: { id: true, nome: true, codigo: true },
    });

    if (!ubs) {
      throw new NotFoundException("ubs_not_found");
    }

    return ubs;
  }
}
