<p align="center">
  <img src="icon.png" alt="Kamado Pool Logo" width="21%">
</p>

# Kamado Pool on StartOS

> Everything not listed in this document should behave the same as upstream
> Kamado Pool. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Kamado Pool](https://github.com/carbonatedberry/KamadoPool) is a solo Bitcoin mining pool: a patched CKPool-solo stratum server, a Go API that merges CKPool's socket data, Bitcoin's RPC and ZMQ feeds and the CKPool log into one live snapshot, and a Svelte dashboard fed over WebSocket. Block rewards are paid by the coinbase directly to the address each miner connects with, so the service holds no funds and performs no payouts.

- **Upstream repo:** <https://github.com/carbonatedberry/KamadoPool>
- **Wrapper repo:** <https://github.com/Start9-Community/KamadoPool-StartOS>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, built by this repository's `Dockerfile` from the `kamado/` submodule, and one subcontainer shared by every process so the API can reach CKPool's Unix socket and tail its log without cross-container plumbing.

| Property      | Value                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Image         | `main`, custom Dockerfile                                                                                                  |
| Source        | `kamado/` submodule: CKPool cloned at the commit it pins with its patch series applied, the dashboard, and the Go API      |
| Architectures | x86_64, aarch64                                                                                                            |
| Base          | Debian slim, with `curl`, `jq`, `stunnel4` and `openssl` alongside the `ckpool`, `ckpmsg` and `kamado-api` binaries        |

| Subcontainer | Purpose                                                              |
| ------------ | -------------------------------------------------------------------- |
| `kamado`     | Every process below — the one to `attach` to for any diagnosis       |

Processes, in start order:

| Name       | Kind    | Runs when                        | Purpose                                                                                       |
| ---------- | ------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `dirs`     | oneshot | always                           | Creates the data, TLS, log and socket directories                                             |
| `api`      | daemon  | always                           | `kamado-api`: dashboard, REST API, WebSocket feed, SQLite persistence, log tailer             |
| `ckpool`   | daemon  | always                           | `kamado-ckpool-run.sh`: waits for Bitcoin, detects the chain, renders `ckpool.conf`, execs CKPool |
| `tls-cert` | oneshot | local TLS enabled in Configure   | `kamado-tls-init.sh`: generates the self-signed stratum certificate if absent or outdated     |
| `stunnel`  | daemon  | local TLS enabled in Configure   | Terminates TLS on the local-network stratum port and forwards to CKPool's loopback bind       |

CKPool always binds three stratum listeners inside the container — plaintext on `3333`, a loopback-only `127.0.0.1:3437` behind stunnel, and `3438` behind the OS-terminated TLS of the public-domain interface — in that fixed order, because it tags every miner with the index of the listener it arrived on and the dashboard maps that index to a connection badge.

## Volume and Data Layout

Two volumes, separating the service's own state from CKPool's, plus a read-only view of Bitcoin's data directory.

| Volume     | Mount Point      | Contents                                                                                                       |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `main`     | `/root/.kamado`  | `store.json` (settings), `data/kamado.db` (SQLite: found blocks, share statistics, best shares, log cursor), `tls/` (self-signed stratum certificate and key) |
| `ckpool`   | `/root/.ckpool`  | CKPool's own state (`users/`, `workers/`, pool status) and its log at `logs/ckpool.log`                         |
| `bitcoind` | `/mnt/bitcoind`  | Bitcoin's `main` volume, read-only, solely for the RPC `.cookie`                                                |

The rendered CKPool configuration (`/etc/ckpool/ckpool.conf`) and the stunnel configuration (`/etc/stunnel/stratum.conf`) live on the subcontainer's root filesystem, not on a volume: they carry Bitcoin's RPC credentials and are regenerated on every start.

## File Models

The package owns one persisted settings file and regenerates everything else from it plus runtime state on every start.

| File                                 | Location             | Seeded                                                                 | Rewritten by                                                              | Hand edit survives |
| ------------------------------------ | -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------ |
| `store.json`                         | `main` volume        | Every field's default on first init, or migrated from the previous package format's `start9/config.yaml` | The Configure action                                                      | Until the next Configure run; an invalid value self-heals to its default |
| `ckpool.conf.template` / `ckpool.conf` | subcontainer rootfs | Rendered on every start from `store.json`, Bitcoin's bridge address and cookie, and the detected chain | Every start                                                              | No                 |
| `stratum.conf` (stunnel)             | subcontainer rootfs  | Rendered on every start, only when local TLS is enabled                | Every start                                                               | No                 |
| `tls/stratum.{crt,key,pem}`, `tls/cert_version`, `tls/fingerprint.txt` | `main` volume | Generated on the first start with local TLS enabled          | The Regenerate TLS Certificate action, or automatically when the certificate format version in `kamado-tls-init.sh` changes | Yes, until regenerated |

`kamado-api` takes every setting from environment variables set by the package (`BITCOIN_RPC_*`, `BITCOIN_ZMQ_BLOCK`, `KAMADO_LOG_LEVEL`, `MEMPOOL_BASE_URL`, `STRATUM_SERVERS`, paths) and re-reads them on every launch, so a Configure change takes effect on the restart it triggers.

## Dependencies

Bitcoin is required and must be running and synced; the service builds block templates from it, validates miner payout addresses against it, and submits solved blocks to it.

| Dependency | Requirement       | Health checks required     | Mounts                                            | Why                                                                      |
| ---------- | ----------------- | -------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Bitcoin    | Required, running | `bitcoind`, `sync-progress` | Its `main` volume at `/mnt/bitcoind`, read-only  | RPC over the internal bridge with cookie authentication; ZMQ `hashblock` for instant new-block notification |

Sync progress is required deliberately: mining against an unsynced node produces work on a stale tip. The RPC address, ZMQ address and cookie are all read reactively, so Bitcoin being installed, restarted, re-bound or removed heals the service with a restart, while a routine Bitcoin update does not restart it. Until Bitcoin is reachable the dashboard runs with placeholder credentials and reports it as unreachable, and `kamado-ckpool-run.sh` keeps CKPool from starting.

## Network Access and Interfaces

Four interfaces: the dashboard, and three raw TCP stratum endpoints miners connect to directly.

| Interface                    | Id                   | Type | Internal port | Preferred external port | Purpose                                                                                                |
| ---------------------------- | -------------------- | ---- | ------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| Web Dashboard                | `ui`                 | ui   | 8080          | —                     | Dashboard, REST API and WebSocket feed                                                                  |
| Stratum                      | `stratum`            | api  | 3333          | 3333                  | Plaintext stratum                                                                                       |
| Stratum (TLS, Local Network) | `stratum-tls`        | api  | 3334          | 3334                  | Stratum over TLS terminated by stunnel with the package's self-signed certificate; only answers when local TLS is enabled in Configure |
| Stratum (TLS, Public Domain) | `stratum-tls-public` | api  | 3438          | 3335                  | Stratum over TLS terminated by StartOS (`addSsl`), which issues a Let's Encrypt certificate for a domain attached here |

The external stratum ports are not package settings. Each binding requests its preferred port when it is first created; StartOS assigns another when that one is taken, and keeps whatever it assigned for the life of the install. The interface shows the port in use and the Pool Status action lists all three, with any domains attached to the public-domain interface and the port each is published on.

The dashboard has no authentication of its own and none is added at the proxy: anything that can reach the `ui` port can read pool data (payout addresses, per-worker hashrates, block history) and call the admin endpoints. Its API refuses cross-origin browser requests on the WebSocket and on every state-changing route.

## Installation and First-Run Flow

There is no setup wizard, no account and no payout address to configure: each miner supplies its own payout address as its stratum username, and the service refuses to authorise a worker whose username is not a valid address on the active chain.

1. Bitcoin must be installed, running and synced; the dependency stays unsatisfied until it is.
2. If ZMQ is enabled in Configure (the default), a task on Bitcoin asks to enable its ZMQ publishers. It is `important`, not blocking: without it the service falls back to RPC polling.
3. On first start the service creates its directories, detects the chain Bitcoin is running (the self-test address CKPool validates at startup depends on it), renders `ckpool.conf` and starts CKPool once Bitcoin answers. The self-signed certificate is generated only once local TLS is enabled.

## Actions

Every action is user-facing. Configure is the only one that writes settings; the rest are diagnostic or maintenance operations.

| Action                       | Run it when                                                                  | What it changes                                                        | Cost                                                               | Safe to repeat                                              |
| ---------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Configure                    | Changing vardiff, the coinbase tag, ZMQ, local TLS, log level or the explorer URL | `store.json`                                                         | Restarts the service; connected miners reconnect                   | Yes                                                         |
| Pool Status                  | Diagnosing anything, or finding the ports miners must use                    | Nothing                                                                | One round of local queries                                         | Yes                                                         |
| Stratum TLS Certificate      | Setting up a miner that must trust the self-signed certificate               | Nothing                                                                | Reads two files                                                    | Yes                                                         |
| Regenerate TLS Certificate   | Rotating an expired or distrusted self-signed certificate                    | Replaces `tls/*` on the `main` volume                                  | Restarts the service; every TLS miner reconnects and must re-trust the new fingerprint | Yes, each run mints a new certificate                       |
| Reset Block Latency          | After tuning ZMQ or the node, to measure from a clean slate                  | The block-update latency counters in `kamado-api`                      | Immediate                                                          | Yes                                                         |
| Rebuild Share Statistics     | The all-time difficulty distribution or rejection reasons look wrong or reset | The stored all-time totals, only when the log accounts for more shares than they hold | Rereads the whole CKPool log, millions of lines on an old pool; mining continues | Yes; a second run is refused while one is in progress |

Pool Status returns a copyable text report: Bitcoin reachability and sync, ZMQ state, CKPool state, uptime, workers, shares, hashrate, best share, block submissions with any unconfirmed gap, connected miners, blocks found, and every stratum endpoint with its assigned port and attached domains. Stratum TLS Certificate and Regenerate TLS Certificate both return the SHA-256 fingerprint and the PEM; both are disabled until local TLS is enabled in Configure. Rebuild Share Statistics reports how many shares the log accounted for and whether the totals were replaced.

## Tasks

One task, on Bitcoin rather than on this service, and only while the operator wants ZMQ.

| Task                              | Raised when                                                                              | Severity  | Cleared when                                                                                  | Where it appears |
| --------------------------------- | ---------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------- | ---------------- |
| Auto-Configure (`zmqEnabled: true`) | ZMQ Block Notifications is on in Configure and Bitcoin's `zmqEnabled` is off             | important | Bitcoin's configuration matches, or ZMQ is turned off in Configure (the task is withdrawn)    | Bitcoin's page   |

The service is never held on a prompt: its own controls are always available, and a Bitcoin that never enables ZMQ only costs slower stale-work detection.

## Health Checks

Six checks: one per daemon, one for the dependency, and three conditions that process state alone cannot reveal.

| Check        | Displayed        | Probes                                                                 | Grace period | Failure means                                                              | Remediation                                                                          |
| ------------ | ---------------- | ---------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `api`        | Web Dashboard    | Port 8080 listening                                                    | 15 s         | `kamado-api` is not serving                                                | Service logs; it exits if `BITCOIN_RPC_*` are unset, which the package never leaves them |
| `ckpool`     | Stratum Server   | Port 3333 listening                                                    | 30 s         | CKPool is not up — usually still waiting for Bitcoin                       | Check Bitcoin is running and reachable; `kamado-ckpool-run.sh` logs each retry       |
| `bitcoin`    | Bitcoin RPC      | `/api/health` reports Bitcoin reachable                                | none         | `kamado-api` cannot call Bitcoin's RPC; the message carries the last error | Bitcoin stopped, restarted (new cookie) or unsynced; the service restarts itself on a cookie or address change |
| `submit-gap` | Block Submission | `/api/health` submit gap is zero                                       | none         | A solved block was submitted but Bitcoin never confirmed it                | Investigate immediately in Bitcoin's logs; this is the one check worth an alarm      |
| `zmq`        | ZMQ Block Feed   | `/api/health` ZMQ feed not stale; only present when ZMQ is enabled     | none         | No ZMQ event for a long while; detection has fallen back to RPC polling    | Accept the task on Bitcoin, or check its ZMQ publishers                              |
| `stunnel`    | Stratum TLS      | Port 3334 listening; only present when local TLS is enabled            | none         | Miners using the local TLS endpoint cannot connect                         | Service logs; run Regenerate TLS Certificate if the certificate files are damaged    |

## Backups and Restore

Both volumes are copied wholesale (`sdk.Backups.ofVolumes('main', 'ckpool')`); nothing is dumped or excluded.

`main` carries settings, the SQLite database and the self-signed certificate, so a restore keeps found blocks, share statistics, best-share records and the fingerprint miners may have pinned. `ckpool` carries CKPool's state and its log; the log is included on purpose, because the database holds a read cursor into it and the share statistics can be rebuilt from it, so restoring one without the other leaves them inconsistent. A restored instance needs nothing rebuilt: there is no wallet and no accounting state, since rewards are paid by the coinbase directly to miners. Bitcoin must be present and synced again before it mines.

## Limitations and Differences

1. The chain is whichever one Bitcoin is running; it is detected at start and there is no selector.
2. The external stratum ports are assigned by StartOS when the interfaces are first bound (3333, 3334 and 3335 are requested) and cannot be changed from the package.
3. Which domain serves the public-domain TLS endpoint is not a setting; it follows whatever is attached to that interface.
4. The public-domain certificate is issued by StartOS. If issuance fails, the endpoint serves StartOS's own certificate, which public clients reject.
5. The dashboard is unauthenticated; see [Network Access and Interfaces](#network-access-and-interfaces).
6. Proof-of-work header capture covers only shares accepted after CKPool was patched to log them; earlier best shares cannot be reconstructed.
7. Share statistics can be rebuilt only as far back as the current CKPool log reaches.
8. `kamado-api` kills CKPool when Bitcoin becomes unreachable so miners fail over instead of mining stale work; StartOS restarts CKPool, which waits for Bitcoin to answer again.
9. Upstream's `docker-compose` deployment reads its settings from a `.env` and runs one container per component; here everything runs in one subcontainer from settings in Configure.

---

## Quick Reference for AI Consumers

```yaml
package_id: kamado-pool
image: main # custom Dockerfile built from the kamado/ submodule
architectures:
  - x86_64
  - aarch64
subcontainers:
  - kamado # every process
volumes:
  main: /root/.kamado # store.json, data/kamado.db, tls/
  ckpool: /root/.ckpool # ckpool state, logs/ckpool.log
  bitcoind: /mnt/bitcoind # read-only dependency mount, rpc cookie
file_models:
  - store.json
startos_managed_env_vars:
  - LISTEN_ADDR
  - CKPOOL_SOCKDIR
  - CKPOOL_LOGFILE
  - DB_PATH
  - BITCOIN_RPC_URL
  - BITCOIN_RPC_USER
  - BITCOIN_RPC_PASSWORD
  - BITCOIN_ZMQ_BLOCK
  - POLL_INTERVAL
  - KAMADO_LOG_LEVEL
  - MEMPOOL_BASE_URL
  - STRATUM_SERVERS
dependencies:
  - bitcoind # required, running, health checks bitcoind + sync-progress
interfaces:
  ui: { type: ui, port: 8080 }
  stratum: { type: api, port: 3333 }
  stratum-tls: { type: api, port: 3334 } # stunnel, self-signed
  stratum-tls-public: { type: api, port: 3438 } # StartOS-terminated TLS, external 3335
actions:
  - config
  - pool-status
  - show-tls-cert
  - regen-tls-cert
  - reset-latency
  - rebuild-share-stats
tasks:
  - { action: bitcoind/autoconfig, severity: important }
health_checks:
  - api # displayed "Web Dashboard"
  - ckpool # displayed "Stratum Server"
  - bitcoin # displayed "Bitcoin RPC"
  - submit-gap # displayed "Block Submission"
  - zmq # displayed "ZMQ Block Feed", only when ZMQ is enabled
  - stunnel # displayed "Stratum TLS", only when local TLS is enabled
```
