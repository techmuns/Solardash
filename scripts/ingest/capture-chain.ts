/**
 * One-off TLS chain capture (debug-gated in refresh-cea). cea.nic.in serves its
 * leaf cert WITHOUT the intermediate (UNABLE_TO_VERIFY_LEAF_SIGNATURE) and is
 * finicky about TLS clients (it RSTs a bare openssl/tls.connect probe but accepts
 * undici's HTTPS request). So we read the leaf the same way undici does — a real
 * HTTPS request with ALPN — grabbing the cert at `secureConnect` over an
 * INSPECTION-ONLY socket (rejectUnauthorized:false, no response body is used),
 * fetch the intermediate named in the leaf's AIA extension, and prove the chain
 * validates against the system PUBLIC root store (`openssl verify`). Only then is
 * the intermediate written out to bundle. The real ingestion fetch in cea.ts
 * stays FULLY verified (it adds this bundled intermediate via NODE_EXTRA_CA_CERTS);
 * cea.ts never disables verification. Always exits 0 — it must not block the job.
 *
 *   npx tsx scripts/ingest/capture-chain.ts <host> [outPath]
 */
import { request as httpsRequest } from "node:https";
import type { TLSSocket, DetailedPeerCertificate } from "node:tls";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";

function readLeaf(host: string, port: number): Promise<DetailedPeerCertificate> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };
    const req = httpsRequest({
      host,
      port,
      method: "GET",
      path: "/",
      servername: host,
      rejectUnauthorized: false, // inspection only — see file header
      ALPNProtocols: ["http/1.1"],
      timeout: 15000,
    });
    req.on("socket", (sock) => {
      const s = sock as TLSSocket;
      s.on("error", () => {}); // swallow a late RST after we have the cert
      s.on("secureConnect", () => {
        const cert = s.getPeerCertificate(true);
        settle(() =>
          cert?.raw ? resolve(cert) : reject(new Error("no peer certificate")),
        );
        s.destroy();
      });
    });
    req.on("response", (res) => res.destroy());
    req.on("error", (e) => settle(() => reject(e)));
    req.on("timeout", () => {
      req.destroy();
      settle(() => reject(new Error("tls timeout")));
    });
    req.end();
  });
}

const derToPem = (der: Buffer): string =>
  `-----BEGIN CERTIFICATE-----\n${der
    .toString("base64")
    .match(/.{1,64}/g)!
    .join("\n")}\n-----END CERTIFICATE-----\n`;

async function main(): Promise<void> {
  const host = process.argv[2] ?? "cea.nic.in";
  const outPath = process.argv[3];
  const port = 443;
  try {
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

    writeFileSync("/tmp/leaf.pem", leafPem);
    writeFileSync("/tmp/inter.pem", interPem);
    let verified = false;
    try {
      const out = execFileSync(
        "openssl",
        ["verify", "-untrusted", "/tmp/inter.pem", "/tmp/leaf.pem"],
        { encoding: "utf8" },
      );
      console.log("openssl verify:", out.trim());
      verified = /\bOK\b/.test(out);
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      console.log("openssl verify FAILED:", err.stdout?.trim(), err.stderr?.trim());
    }

    // Only bundle an intermediate that demonstrably chains to a PUBLIC root.
    if (verified && outPath) {
      writeFileSync(outPath, interPem.endsWith("\n") ? interPem : `${interPem}\n`);
      console.log(`wrote verified intermediate -> ${outPath}`);
    }
    console.log("=== BEGIN INTERMEDIATE PEM ===");
    console.log(interPem.trim());
    console.log("=== END INTERMEDIATE PEM ===");
  } catch (e) {
    const err = e as { message?: string; cause?: { code?: string } };
    console.log(`capture failed: ${err.message ?? e}${err.cause?.code ? ` (${err.cause.code})` : ""}`);
  }
}

void main();
