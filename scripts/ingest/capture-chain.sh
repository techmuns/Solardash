#!/usr/bin/env bash
# Capture a host's omitted TLS intermediate CA and prove the chain reaches a
# PUBLIC root — the secure fix for UNABLE_TO_VERIFY_LEAF_SIGNATURE (a server that
# serves its leaf cert without the intermediate). We fetch the real intermediate
# named in the leaf's AIA extension and bundle it; verification stays ON. If the
# chain does NOT verify against the system (public) root store, the root is not
# publicly trusted and we must NOT trust it — fall back to manual data instead.
#
# Usage: bash scripts/ingest/capture-chain.sh <host> [port]
set -uo pipefail
host="${1:?host required}"
port="${2:-443}"
work="$(mktemp -d)"

echo | openssl s_client -connect "${host}:${port}" -servername "${host}" 2>/dev/null \
  | openssl x509 -out "${work}/leaf.pem" 2>/dev/null || { echo "no leaf cert"; exit 0; }

echo "=== leaf ==="
openssl x509 -in "${work}/leaf.pem" -noout -subject -issuer 2>/dev/null

aia="$(openssl x509 -in "${work}/leaf.pem" -noout -text 2>/dev/null \
  | grep -A1 'CA Issuers' | grep -oE 'https?://[^ ]+' | head -1)"
echo "=== AIA CA Issuers: ${aia:-<none>} ==="
[ -z "${aia}" ] && { echo "no AIA url"; exit 0; }

curl -fsSL "${aia}" -o "${work}/inter.bin" || { echo "intermediate download failed"; exit 0; }
if   openssl x509   -inform DER -in "${work}/inter.bin" -out "${work}/inter.pem" 2>/dev/null; then :
elif openssl pkcs7  -inform DER -print_certs -in "${work}/inter.bin" -out "${work}/inter.pem" 2>/dev/null; then :
else cp "${work}/inter.bin" "${work}/inter.pem"; fi

echo "=== intermediate ==="
openssl x509 -in "${work}/inter.pem" -noout -subject -issuer 2>/dev/null

echo "=== VERIFY leaf via intermediate against the system PUBLIC root store ==="
openssl verify -untrusted "${work}/inter.pem" "${work}/leaf.pem"

echo "=== BEGIN INTERMEDIATE PEM ==="
cat "${work}/inter.pem"
echo "=== END INTERMEDIATE PEM ==="
