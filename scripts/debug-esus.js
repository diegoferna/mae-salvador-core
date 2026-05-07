require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.ESUS_DATABASE_URL });
  const doc = process.argv[2] || "01843011573";

  await client.connect();
  console.log("connected");

  try {
    const simple = await client.query(
      `SELECT c.nu_cns, c.nu_cpf, c.no_cidadao
       FROM tb_cidadao c
       WHERE replace(replace(replace(coalesce(c.nu_cpf,''),'.',''),'-',''),' ','') = $1
       LIMIT 1`,
      [doc],
    );
    console.log("simple rows", simple.rows.length, simple.rows[0] || null);
  } catch (error) {
    console.error("simple error", error.message);
  }

  try {
    const adapterLike = await client.query(
      `SELECT
         c.nu_cns,
         c.nu_cpf,
         c.no_cidadao,
         c.no_social,
         c.no_mae,
         c.no_pai,
         c.dt_nascimento::text AS dt_nascimento,
         c.no_sexo,
         c.nu_telefone_celular,
         c.nu_telefone_residencial,
         c.ds_email,
         c.ds_logradouro,
         c.nu_numero,
         c.ds_complemento,
         c.no_bairro,
         c.ds_cep,
         r.no_raca_cor
       FROM tb_cidadao c
       LEFT JOIN tb_raca_cor r ON c.co_raca_cor = r.co_raca_cor
       WHERE (length($1) = 11 AND regexp_replace(coalesce(c.nu_cpf,''), '\\D', '', 'g') = $1)
          OR (length($1) = 15 AND regexp_replace(coalesce(c.nu_cns,''), '\\D', '', 'g') = $1)
       LIMIT 1`,
      [doc],
    );
    console.log("adapter rows", adapterLike.rows.length, adapterLike.rows[0] || null);
  } catch (error) {
    console.error("adapter error", error.message);
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
