import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/PrismaService";
import { IntegracaoService } from "../../integracao/services/IntegracaoService";
import { BuscarCnsPorDadosInput } from "../graphql/inputs/BuscarCnsPorDadosInput";
import { VerificarCadastroPorDadosInput } from "../graphql/inputs/VerificarCadastroPorDadosInput";

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integracaoService: IntegracaoService,
  ) {}

  async verificarCadastroPorCpf(cpf: string): Promise<{ existe: boolean }> {
    const cpfNormalizado = cpf.replace(/\D/g, "");
    if (!cpfNormalizado || cpfNormalizado.length !== 11) {
      throw new BadRequestException("invalid_cpf");
    }

    const result = await this.prisma.$queryRaw<Array<{ existe: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM usuario u
        WHERE regexp_replace(coalesce(u.cpf, ''), '\\D', '', 'g') = ${cpfNormalizado}
      )::boolean AS existe
    `;

    return { existe: result[0]?.existe ?? false };
  }

  async verificarCadastroPorCns(cns: string): Promise<{ existe: boolean }> {
    const cnsNormalizado = cns.replace(/\D/g, "");
    if (!cnsNormalizado || cnsNormalizado.length !== 15) {
      throw new BadRequestException("invalid_cns");
    }

    const result = await this.prisma.$queryRaw<Array<{ existe: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM usuario u
        WHERE regexp_replace(coalesce(u.cns, ''), '\\D', '', 'g') = ${cnsNormalizado}
      )::boolean AS existe
    `;

    return { existe: result[0]?.existe ?? false };
  }

  buscarCnsPorDados(input: BuscarCnsPorDadosInput) {
    return this.integracaoService.buscarCnsPorDados(input);
  }

  async verificarCadastroPorDados(input: VerificarCadastroPorDadosInput): Promise<{ existe: boolean }> {
    const nomeCompleto = input.nomeCompleto.trim();
    if (!nomeCompleto) {
      throw new BadRequestException("invalid_nome_completo");
    }

    const local = await this.prisma.$queryRaw<Array<{ existe: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM gestante g
        INNER JOIN pessoa p ON p.id = g.pessoa_id
        INNER JOIN usuario u ON u.id = g.usuario_id
        WHERE lower(trim(p.nome_completo)) = lower(trim(${nomeCompleto}))
      )::boolean AS existe
    `;
    if (local[0]?.existe) {
      return { existe: true };
    }

    const cnsLookup = await this.integracaoService.buscarCnsPorDados({
      nome: nomeCompleto,
      nomeMae: input.nomeMae,
      dataNascimento: input.dataNascimento,
    });

    if (!cnsLookup.sucesso || !cnsLookup.cidadao?.cns) {
      return { existe: false };
    }

    return this.verificarCadastroPorCns(cnsLookup.cidadao.cns);
  }
}
