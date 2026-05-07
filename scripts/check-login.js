require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { scryptSync, timingSafeEqual } = require("crypto");
const bcrypt = require("bcrypt");

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.APP_DATABASE_URL } },
  });

  const doc = "01843011573".replace(/\D/g, "");
  const user = await prisma.usuario.findFirst({
    where: { OR: [{ cpf: doc }, { cns: doc }] },
    include: { gestante: { include: { pessoa: true } } },
  });

  if (!user) {
    console.log("NOT_FOUND");
    await prisma.$disconnect();
    return;
  }

  let okScrypt = false;
  let okBcrypt = false;

  if (user.senhaHash) {
    if (user.senhaHash.includes(":")) {
      const [salt, hash] = user.senhaHash.split(":");
      if (salt && hash) {
        const computed = scryptSync("123qweasd", salt, 64).toString("hex");
        const left = Buffer.from(computed, "hex");
        const right = Buffer.from(hash, "hex");
        okScrypt = left.length === right.length && timingSafeEqual(left, right);
      }
    }

    try {
      okBcrypt = await bcrypt.compare("123qweasd", user.senhaHash);
    } catch {}
  }

  console.log(
    JSON.stringify(
      {
        found: true,
        id: user.id,
        tipo: user.tipo,
        status: user.status,
        cpf: user.cpf,
        cns: user.cns,
        hasHash: Boolean(user.senhaHash),
        hashHasColon: Boolean(user.senhaHash?.includes(":")),
        nome: user.gestante?.pessoa?.nome ?? null,
        passwordCheck: { okScrypt, okBcrypt },
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
