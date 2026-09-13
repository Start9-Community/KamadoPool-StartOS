#!/bin/bash
# Generates the self-signed stratum certificate stunnel serves. Regenerates only
# when a file is missing or the format marker is outdated, so pinned
# fingerprints survive restarts and updates.
#
# Env (set by main.ts): TLS_DIR.
set -euo pipefail

TLS_DIR="${TLS_DIR:-/root/.kamado/tls}"
CRT="${TLS_DIR}/stratum.crt"
KEY="${TLS_DIR}/stratum.key"
CERT="${TLS_DIR}/stratum.pem"
MARKER="${TLS_DIR}/cert_version"

mkdir -p "${TLS_DIR}"

# Bump whenever the extensions below change; every install then regenerates on its next start
TLS_CERT_VERSION=4

NEEDS_REGEN=false
if [[ ! -f "${CERT}" || ! -f "${CRT}" || ! -f "${KEY}" ]]; then
    NEEDS_REGEN=true
elif [[ ! -f "${MARKER}" ]] \
     || [[ "$(cat "${MARKER}" 2>/dev/null)" != "${TLS_CERT_VERSION}" ]]; then
    echo "kamado-tls: TLS cert is older format (want v${TLS_CERT_VERSION}); regenerating"
    NEEDS_REGEN=true
fi

if [[ "${NEEDS_REGEN}" == "true" ]]; then
    echo "kamado-tls: generating self-signed stratum TLS cert v${TLS_CERT_VERSION}"
    CONF=$(mktemp)
    cat > "${CONF}" <<'OPENSSL_CONF'
[ req ]
default_bits       = 2048
default_md         = sha256
prompt             = no
distinguished_name = req_dn
x509_extensions    = v3_cert

[ req_dn ]
CN = kamado-pool

[ v3_cert ]
basicConstraints     = critical, CA:FALSE
keyUsage             = critical, digitalSignature, keyEncipherment
extendedKeyUsage     = serverAuth
subjectKeyIdentifier = hash
subjectAltName       = @alt_names

[ alt_names ]
DNS.1  = kamado-pool.embassy
DNS.2  = kamado-pool
DNS.3  = localhost
# Wildcards for the hostnames miner firmware verifies the SAN against (e.g. AxeOS on host.local)
DNS.4  = *.local
DNS.5  = *.embassy
DNS.6  = *.onion
DNS.7  = *.home.arpa
DNS.8  = *.lan
DNS.9  = *.internal
IP.1   = 127.0.0.1
OPENSSL_CONF

    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "${KEY}" \
        -out   "${CRT}" \
        -days 3650 \
        -config "${CONF}" \
        >/dev/null 2>&1
    rm -f "${CONF}"

    cat "${CRT}" "${KEY}" > "${CERT}"
    chmod 600 "${KEY}" "${CERT}"
    printf '%s\n' "${TLS_CERT_VERSION}" > "${MARKER}"

    echo "kamado-tls: cert extensions:"
    openssl x509 -in "${CRT}" -noout -ext subjectAltName,extendedKeyUsage,keyUsage 2>&1 \
        | sed 's/^/  /'
fi

FINGERPRINT=$(openssl x509 -in "${CRT}" -noout -fingerprint -sha256 | cut -d= -f2)
printf '%s\n' "${FINGERPRINT}" > "${TLS_DIR}/fingerprint.txt"
echo "kamado-tls: stratum TLS SHA256 fingerprint: ${FINGERPRINT}"
