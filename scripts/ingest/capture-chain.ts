/**
 * One-off TLS chain capture (debug-gated in refresh-cea). Reads a host's leaf
 * certificate over an INSPECTION-ONLY TLS socket — no application data is ever
 * sent over it — then obtains the intermediate the server omits (server-sent
 * issuer if present, else the cert named in the leaf's AIA extension) and proves
 * the chain validates against the system PUBLIC root store via `openssl verify`.
 *
 * Output: the intermediate PEM to bundle, so the real Executive-Summary fetch in
 * cea.ts can stay FULLY verified (it adds the bundled intermediate via
 * NODE_EXTRA_CA_CERTS). This script is NOT on the ingestion data path and cea.ts
 * never disables verification. openssl s_client can't be used here — cea.nic.in
 * rejects its ClientHello while accepting Node's.
 *
 *   npx tsx scripts/ingest/capture-chain.ts <host> [port]
 */
import { connect, type DetailedPeerCertificate } from "node:tls";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";

function readLeaf(host: string, port: number): Promise<DetailedPeerCertificate> {
  return new Promise((resolve, reject) => {
    // Inspection-only: rejectUnauthorized:false lets us READ the public leaf to
    // discover its AIA issuer URL. No data is sent; the socket closes at once.
    const socket = connect(
      { host, port, servername: host, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate(true);
        socket.end();
        if (cert?.raw) resolve(cert);
        else reject(new Error("no peer certificate"));
      },
    );
    socket.on("error", reject);
    socket.setTimeout(15000, () => {
      socket.destroy();
      reject(new Error("tls timeout"));
    });
  });
}

const derToPem = (der: Buffer): string =>
  `-----BEGIN CERTIFICATE-----\n${der
    .toString("base64")
    .match(/.{1,64}/g)!
    .join("\n")}\n-----END CERTIFICATE-----\n`;

async function main(): Promise<void> {
  const host = process.argv[2] ?? "cea.nic.in";
  const port = Number(process.argv[3] ?? 443);

  const leaf = await readLeaf(host, port);
  console.log("leaf subject:", JSON.stringify(leaf.subject));
  console.log("leaf issuer :", JSON.stringify(leaf.issuer));
  const leafPem = derToPem(leaf.raw);

  let interPem: string | null = null;
  const sent = leaf.issuerCertificate;
  if (sent?.raw && sent.fingerprint256 !== leaf.fingerprint256) {
    interPem = derToPem(sent.raw);
    console.log("intermediate: server-sent");
  } else {
    const aia = (leaf as unknown as { infoAccess?: Record<string, string[]> })
      .infoAccess?.["CA Issuers - URI"]?.[0];
    console.log("AIA CA Issuers:", aia ?? "<none>");
    if (aia) {
      const res = await fetch(aia);
      const buf = Buffer.from(await res.arrayBuffer());
      try {
        interPem = new X509Certificate(buf).toString();
      } catch {
        interPem = buf.toString("utf8");
      }
    }
  }

  if (!interPem) {
    console.log("No intermediate could be obtained — cannot fix the chain.");
    return;
  }
  console.log("intermediate subject:", JSON.stringify(new X509Certificate(interPem).subject));

  // Prove leaf → intermediate → PUBLIC root validates, offline against the
  // system store. "OK" => a missing-intermediate (fixable); a failure => the
  // root is not publicly trusted (do NOT bundle — fall back to manual data).
  writeFileSync("/tmp/leaf.pem", leafPem);
  writeFileSync("/tmp/inter.pem", interPem);
  try {
    const out = execFileSync(
      "openssl",
      ["verify", "-untrusted", "/tmp/inter.pem", "/tmp/leaf.pem"],
      { encoding: "utf8" },
    );
    console.log("openssl verify:", out.trim());
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    console.log("openssl verify FAILED:", err.stdout?.trim(), err.stderr?.trim());
  }

  console.log("=== BEGIN INTERMEDIATE PEM ===");
  console.log(interPem.trim());
  console.log("=== END INTERMEDIATE PEM ===");
}

void main();
