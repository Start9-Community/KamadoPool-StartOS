#!/bin/bash
# Waits for bitcoind, fills the chain-dependent self-test address into the
# ckpool.conf template main.ts rendered, then execs ckpool.
#
# Env (set by main.ts): BITCOIN_RPC_URL, BITCOIN_RPC_USER,
# BITCOIN_RPC_PASSWORD, CKPOOL_SOCKDIR.
set -euo pipefail

TEMPLATE=/etc/ckpool/ckpool.conf.template
CONF=/etc/ckpool/ckpool.conf
SOCKDIR="${CKPOOL_SOCKDIR:-/run/ckpool}"

# 6 = LOG_INFO, the level at which ckpool logs each accepted/rejected share
CKPOOL_LOGLEVEL="${CKPOOL_LOGLEVEL:-6}"

rpc() {
    curl -sf --max-time 5 \
        -u "${BITCOIN_RPC_USER}:${BITCOIN_RPC_PASSWORD}" \
        -d "{\"jsonrpc\":\"1.0\",\"method\":\"$1\",\"params\":[]}" \
        -H 'Content-Type: application/json' \
        "${BITCOIN_RPC_URL}"
}

echo "kamado-ckpool: waiting for bitcoind at ${BITCOIN_RPC_URL}..."
backoff=2
until CHAIN_INFO=$(rpc getblockchaininfo); do
    echo "kamado-ckpool: bitcoind not reachable (retry in ${backoff}s)"
    sleep "${backoff}"
    backoff=$(( backoff < 30 ? backoff * 2 : 30 ))
done

# btcaddress is only used for ckpool's coinbase self-test at startup; solo mode
# pays the worker's stratum username, so the genesis coinbase address of the
# active network serves as an always-valid placeholder.
CHAIN=$(printf '%s' "${CHAIN_INFO}" | jq -r '.result.chain // "main"')
case "${CHAIN}" in
    test|testnet4|signet|regtest)
        SELFTEST_ADDRESS="mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn"
        ;;
    main)
        SELFTEST_ADDRESS="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        ;;
    *)
        echo "kamado-ckpool: unknown chain '${CHAIN}', assuming mainnet" >&2
        SELFTEST_ADDRESS="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        ;;
esac

sed "s|@SELFTEST_ADDRESS@|${SELFTEST_ADDRESS}|g" "${TEMPLATE}" > "${CONF}"

mkdir -p "${SOCKDIR}"

echo "kamado-ckpool: starting ckpool (solo, chain=${CHAIN}), loglevel ${CKPOOL_LOGLEVEL}"
exec /usr/local/bin/ckpool --btcsolo --quiet --config "${CONF}" \
    --sockdir "${SOCKDIR}" --log-shares -l "${CKPOOL_LOGLEVEL}"
