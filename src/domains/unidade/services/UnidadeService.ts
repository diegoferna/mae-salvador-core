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

  async resolverPorCnesOuNome(input: { cnes?: string | null; nome: string }) {
    const cnes = input.cnes?.trim();
    if (cnes) {
      const porCnes = await this.prisma.ubs.findFirst({
        where: { cnes },
        select: { id: true, nome: true, codigo: true },
      });
      if (porCnes) return porCnes;
    }
    return this.resolverPorNome(input.nome);
  }
}
