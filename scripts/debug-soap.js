require("dotenv").config();

async function main() {
  const doc = (process.argv[2] || "").replace(/\D/g, "");
  const action = doc.length === 11 ? "PesquisarPacientePorCPF" : "PesquisarPacientePorCNS";
  const tag = doc.length === 11 ? "cpf" : "cns";
  const envelope = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    "  <soap:Body>",
    `    <ns:${action} xmlns:ns="http://servicos.nti.sms.salvador.ba.br/">`,
    `      <${tag}>${doc}</${tag}>`,
    `    </ns:${action}>`,
    "  </soap:Body>",
    "</soap:Envelope>",
  ].join("\n");

  const auth = Buffer.from(
    `${process.env.CNS_FEDERAL_USER}:${process.env.CNS_FEDERAL_PASSWORD}`,
    "utf-8",
  ).toString("base64");

  const res = await fetch(process.env.CNS_FEDERAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      Authorization: `Basic ${auth}`,
      SOAPAction: '""',
    },
    body: envelope,
  });

  const text = await res.text();
  console.log("status", res.status);
  console.log(text.slice(0, 4000));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
