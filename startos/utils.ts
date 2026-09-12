import { T } from '@start9labs/start-sdk'
import {
  rpcHostId as btcRpcHostId,
  rpcPort as btcRpcPort,
  zmqHostId as btcZmqHostId,
  zmqPortBlock as btcZmqPortBlock,
} from 'bitcoin-core-startos/startos/utils'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const uiPort = 8080

// In-container binds are fixed: a binding is keyed by (host, internal port), so moving one orphans it
export const stratumInternalPort = 3333
export const stratumTlsInternalPort = 3334
/** ckpool's loopback bind behind stunnel (self-signed certificate) */
export const ckpoolTlsLoopbackPort = 3437
/** ckpool's bind behind the OS-terminated TLS of the public-domain interface */
export const ckpoolPublicTlsPort = 3438

// Preferred external ports; the OS keeps whatever it assigned at first bind
export const stratumExternalPort = 3333
export const stratumTlsExternalPort = 3334
export const stratumPublicTlsExternalPort = 3335

export const uiHostId = 'ui'
export const stratumHostId = 'stratum'
export const stratumTlsHostId = 'stratum-tls'
export const stratumPublicTlsHostId = 'stratum-tls-public'

export const kamadoRoot = '/root/.kamado'
export const ckpoolRoot = '/root/.ckpool'
export const btcMountpoint = '/mnt/bitcoind'
export const ckpoolLogDir = `${ckpoolRoot}/logs`
export const ckpoolLogFile = `${ckpoolLogDir}/ckpool.log`
export const ckpoolSocketDir = '/run/ckpool'
export const kamadoDataDir = `${kamadoRoot}/data`
export const kamadoDbPath = `${kamadoDataDir}/kamado.db`
export const tlsDir = `${kamadoRoot}/tls`
export const stunnelConfDir = '/etc/stunnel'
export const tlsVolumeFiles = [
  'tls/stratum.crt',
  'tls/stratum.key',
  'tls/stratum.pem',
  'tls/cert_version',
  'tls/fingerprint.txt',
]

export const healthUrl = `http://127.0.0.1:${uiPort}/api/health`

export const logLevels = {
  debug: i18n('Debug'),
  info: i18n('Info'),
  warn: i18n('Warn'),
  error: i18n('Error'),
}
export type LogLevel = keyof typeof logLevels

export type HealthPayload = {
  ok: boolean
  ckpool: boolean
  bitcoin: boolean
  submit_gap: number
  zmq_stale: boolean
  last_error?: string
}

export async function fetchJson<Res>(url: string): Promise<Res | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    return res.ok ? ((await res.json()) as Res) : null
  } catch {
    return null
  }
}

/** Mirrors state.StratumServer in kamado-api; the dashboard switches on `kind` */
export type StratumServer = {
  kind: 'plain' | 'tls-local' | 'tls-public'
  label: string
}

// ckpool tags each client with the index of the serverurl it arrived on, so the order is fixed
export const stratumServerUrls = [
  `0.0.0.0:${stratumInternalPort}`,
  `127.0.0.1:${ckpoolTlsLoopbackPort}`,
  `0.0.0.0:${ckpoolPublicTlsPort}`,
]

/** Labels are rendered by the English-only dashboard, not the StartOS UI */
export function stratumServers(publicDomains: string[]): StratumServer[] {
  return [
    { kind: 'plain', label: 'Plaintext, not encrypted' },
    {
      kind: 'tls-local',
      label: 'TLS, self-signed certificate (local network)',
    },
    {
      kind: 'tls-public',
      label: publicDomains.length
        ? `TLS, CA-issued certificate for ${publicDomains.join(', ')}`
        : 'TLS, CA-issued certificate for a public domain',
    },
  ]
}

/** bitcoind's RPC and ZMQ-block endpoints over the LXC bridge; null while bitcoind is absent */
export const bitcoindBridge = async (effects: T.Effects) => ({
  rpc: await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'bitcoind',
      hostId: btcRpcHostId,
      internalPort: btcRpcPort,
      ssl: false,
    })
    .const(),
  zmqBlock: await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'bitcoind',
      hostId: btcZmqHostId,
      internalPort: btcZmqPortBlock,
    })
    .const(),
})

/** bitcoind's `.cookie` is `__cookie__:<random>`; null until bitcoind has written it */
export function parseCookie(cookie: string | null | undefined) {
  const trimmed = cookie?.trim() ?? ''
  const i = trimmed.indexOf(':')
  if (i <= 0) return null
  return { user: trimmed.slice(0, i), password: trimmed.slice(i + 1) }
}
