# Kamado Pool

## Documentation

- [Kamado Pool](https://github.com/carbonatedberry/KamadoPool) — the upstream project: architecture, the CKPool patches, the dashboard features and the API reference.
- [CKPool](https://bitbucket.org/ckolivas/ckpool) — the stratum server Kamado is built on, including the `mindiff`/`startdiff`/`maxdiff` and `dropidle` settings exposed in Configure.

## What you get on StartOS

- **A running solo pool**: the stratum server, the API and the dashboard, each with its own health check on the service page.
- **A real-time dashboard** with live hashrate, per-miner stats, hardware detection, block history, best-share leaderboards, a proof-of-work inspector for your best share, and a transaction accelerator.
- **Three stratum endpoints on your network**, each on its own port: plaintext, TLS with a self-signed certificate for miners on your local network, and TLS with a Let's Encrypt certificate for miners connecting over the internet.
- **No payout address to configure.** Each miner supplies its own Bitcoin address as its stratum username and receives the full reward of any block it solves.

## Getting set up

1. Install and start **Bitcoin**, and let it finish syncing. Kamado will not mine until Bitcoin is synced.
2. On Bitcoin's page, accept the task Kamado raises to enable **ZMQ**. It is recommended, not required: it gives sub-second new-block detection, and without it Kamado polls Bitcoin instead.
3. Start Kamado Pool and open the **Web Dashboard** from the interface list.
4. Point a miner at the **Stratum** interface (see below). Its shares appear on the dashboard within a few seconds.

## Connecting miners

Use the address shown on the **Stratum** interface:

```text
stratum+tcp://<address>:<port>
```

- **Username**: the Bitcoin address that should receive the block reward, optionally followed by `.workername` to label the miner on the dashboard (e.g. `bc1q....myBitaxe`).
- **Password**: ignored, anything works.

Kamado checks each username against Bitcoin and refuses to authorise a worker whose username is not a valid address on the active network, so a misconfigured miner fails loudly instead of mining to nowhere.

StartOS assigns the port when the service is installed (3333 unless another service already holds it) and shows it on the interface. The **Pool Status** action lists the ports of all three stratum endpoints.

### Stratum over TLS

Kamado offers two TLS endpoints, because miners on your local network and miners on the internet need different certificates.

**Over the internet — Stratum (TLS, Public Domain).** Attach a domain to this interface and choose Let's Encrypt; StartOS obtains and renews the certificate. Point the miner at:

```text
stratum+ssl://<your-domain>:<port>
```

The port is shown on the interface (3335 unless it was taken), and **Pool Status** lists every attached domain with its port. Set the miner to use its built-in certificates; a Let's Encrypt chain validates with nothing pasted in. If a miner reports an untrusted certificate, StartOS has not been able to issue one yet: check the domain on that interface, that its DNS points at your server, and that the port is reachable from the internet.

**On your local network — Stratum (TLS, Local Network).** Turn on **Stratum TLS (Local Network)** in Configure to serve a self-signed certificate on its own port. No public authority signs a bare LAN address, so this certificate has to be trusted by hand. Run the **Stratum TLS Certificate** action to get:

- the **SHA-256 fingerprint**, for firmware that pins fingerprints, and
- the **full PEM**, for firmware that accepts a custom root (AxeOS has a *Stratum SSL Cert* field for exactly this).

Or connect with `stratum+ssl://` and certificate verification disabled. **Regenerate TLS Certificate** replaces it with a new one and restarts the pool; miners that pinned the old certificate need the new fingerprint.

The dashboard's padlock names which certificate each miner arrived on when you hover it.

## Proving your best share

Every share that sets a new record is stored with the block header behind it. The dashboard's **best share** tile opens an analysis page, and **Show PoW** there draws the header field by field, with the raw 80 bytes anyone can hash to check the work themselves. **Verify** replays the whole SHA-256 computation in your browser, ending on the block hash and its comparison against the share and network targets. Headers are only kept for shares accepted after Kamado was installed, so the page stays empty until a new record is set.

## Configuration

Everything lives in **Configure**: vardiff (starting, minimum and maximum difficulty), the idle-client disconnect, the coinbase tag embedded in solved blocks, ZMQ, local-network TLS, the log level, and an optional self-hosted mempool instance for the dashboard's explorer links. Saving restarts the pool; miners reconnect on their own.

### Actions

- **Pool Status**: a copyable snapshot of Bitcoin sync, pool health, miners, hashrate, found blocks, block submissions and every stratum endpoint's port and domains. Run it first when anything looks wrong.
- **Stratum TLS Certificate**: the fingerprint and PEM of the self-signed certificate.
- **Regenerate TLS Certificate**: a fresh self-signed certificate; restarts the pool.
- **Reset Block Latency**: zeroes the block-update latency counters after tuning ZMQ or Bitcoin.
- **Rebuild Share Statistics**: recounts the all-time difficulty distribution and rejection reasons from CKPool's log, for when those totals look wrong. It only ever adds history back, never removes it, and can take a while on a pool with a long log.

## Troubleshooting

- **No miners appear after connecting**: run **Pool Status** and check the port under Endpoints against what the miner is pointed at, then check the service logs for the miner's authorisation.
- **Bitcoin RPC health check is failing**: make sure Bitcoin is running and fully synced. Kamado stops the stratum server while Bitcoin is unreachable so miners fail over to a backup pool, and brings it back on its own once Bitcoin answers.
- **Best share resets to 0 after a block is found**: CKPool zeroes the current round's best on a solve; the dashboard's all-time column keeps the record.
- **Miner rejects the self-signed certificate**: re-check that the whole PEM was pasted (including the BEGIN/END lines), or pin the fingerprint, or disable verification in the miner.
- **Miner set to system certificates rejects the public-domain endpoint**: it must connect by the domain name, not by IP, and StartOS must have issued the certificate; see *Stratum over TLS* above.
