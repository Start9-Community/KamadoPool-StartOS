import { T } from '@start9labs/start-sdk'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  ckpoolPublicTlsPort,
  fetchJson,
  stratumHostId,
  stratumInternalPort,
  stratumPublicTlsHostId,
  stratumTlsHostId,
  stratumTlsInternalPort,
  uiPort,
} from '../utils'

const units = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s']
function fmtHashrate(hs: number): string {
  let i = 0
  while (hs >= 1000 && i < units.length - 1) {
    hs /= 1000
    i++
  }
  return `${hs.toFixed(i ? 2 : 0)} ${units[i]}`
}

function fmtDiff(d: number): string {
  const suffixes = ['', 'K', 'M', 'G', 'T']
  let i = 0
  while (d >= 1000 && i < suffixes.length - 1) {
    d /= 1000
    i++
  }
  return `${d.toFixed(i ? 2 : 0)}${suffixes[i]}`
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** The external ports the OS granted the three stratum endpoints */
async function endpointPorts(effects: T.Effects) {
  const specs = [
    {
      label: i18n('Stratum'),
      hostId: stratumHostId,
      internalPort: stratumInternalPort,
      ssl: false,
    },
    {
      label: i18n('Stratum (TLS, Local Network)'),
      hostId: stratumTlsHostId,
      internalPort: stratumTlsInternalPort,
      ssl: false,
    },
    {
      label: i18n('Stratum (TLS, Public Domain)'),
      hostId: stratumPublicTlsHostId,
      internalPort: ckpoolPublicTlsPort,
      ssl: true,
    },
  ]
  return Promise.all(
    specs.map(async (spec) => {
      const binding = await sdk.host
        .getOwn(
          effects,
          spec.hostId,
          (host) => host?.bindings[spec.internalPort],
        )
        .once()
      return {
        label: spec.label,
        assigned:
          (spec.ssl
            ? binding?.net.assignedSslPort
            : binding?.net.assignedPort) ?? null,
        domains: (binding?.addresses.available ?? []).flatMap((a) =>
          a.metadata.kind === 'public-domain' && a.port !== null
            ? [{ fqdn: a.hostname, port: a.port }]
            : [],
        ),
      }
    }),
  )
}

/** The slice of kamado-api's /api/snapshot this report reads */
type Snapshot = {
  pool: {
    workers: number
    users: number
    accepted: number
    rejected: number
  } | null
  uptime_seconds: number
  hashrate_hs_1m: number
  hashrate_hs_5m: number
  hashrate_hs_1h: number
  hashrate_hs_24h: number
  best_diff: number
  next_block_reward_btc: number
  next_difficulty_percent: number
  chain: {
    chain: string
    blocks: number
    headers: number
    difficulty: number
    initialblockdownload: boolean
    verificationprogress: number
  } | null
  network_hashrate_hs: number
  recent_blocks?: {
    height: number
    hash?: string
    reward_btc?: number
    found_at: string
    orphaned_at?: string
    chain?: string
    miner?: string
  }[]
  ckpool_ok: boolean
  bitcoin_ok: boolean
  last_error?: string
  block_submit_attempts: number
  block_submits_confirmed: number
  zmq_enabled: boolean
  zmq_stale: boolean
  has_last_zmq_event: boolean
  last_zmq_event_age?: number
  workers: {
    worker: string
    bestdiff: number
    bestever: number
    idle: boolean
  }[]
  clients: {
    id: number
    workername: string
    diff: number
    dsps1: number
    useragent: string
  }[]
}

export const poolStatus = sdk.Action.withoutInput(
  // id
  'pool-status',

  // metadata
  async ({ effects }) => ({
    name: i18n('Pool Status'),
    description: i18n(
      'Displays a full status snapshot: Bitcoin sync state, ckpool health, connected miners, hashrate, found blocks, and the ports miners must connect to.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  // the execution function
  async ({ effects }) => {
    const ports = await endpointPorts(effects)
    const snap = await fetchJson<Snapshot>(
      `http://127.0.0.1:${uiPort}/api/snapshot`,
    )

    const lines: string[] = []
    const row = (label: string, value: string) =>
      lines.push(`  ${label.padEnd(30)} ${value}`)
    let healthy = !!snap?.ckpool_ok && !!snap?.bitcoin_ok

    if (!snap) {
      lines.push(
        i18n(
          'The Kamado API is unreachable, the service may still be starting.',
        ),
      )
    } else {
      lines.push(i18n('Bitcoin'))
      row(
        i18n('Status'),
        snap.bitcoin_ok
          ? 'OK'
          : `${i18n('unreachable')}${snap.last_error ? ` (${snap.last_error})` : ''}`,
      )
      if (snap.chain) {
        const pct = (snap.chain.verificationprogress * 100).toFixed(2)
        row(
          i18n('Chain'),
          `${snap.chain.chain}  ${i18n('height')} ${snap.chain.blocks}  ${i18n('headers')} ${snap.chain.headers}`,
        )
        row(
          i18n('Sync'),
          snap.chain.initialblockdownload
            ? i18n(
                'initial block download, ${pct}% (the pool will not mine until synced)',
                { pct },
              )
            : i18n('fully synced (${pct}%)', { pct }),
        )
        row(i18n('Difficulty'), fmtDiff(snap.chain.difficulty))
        row(i18n('Network hashrate'), fmtHashrate(snap.network_hashrate_hs))
        if (snap.chain.initialblockdownload) healthy = false
      }
      if (snap.next_block_reward_btc > 0)
        row(
          i18n('Next block reward'),
          `${snap.next_block_reward_btc.toFixed(8)} BTC`,
        )
      if (snap.next_difficulty_percent !== 0)
        row(
          i18n('Next difficulty'),
          `${snap.next_difficulty_percent > 0 ? '+' : ''}${snap.next_difficulty_percent.toFixed(1)}%`,
        )
      if (!snap.zmq_enabled) row('ZMQ', i18n('disabled'))
      else {
        const age = snap.has_last_zmq_event
          ? i18n('last event ${age}s ago', {
              age: (snap.last_zmq_event_age ?? 0).toFixed(0),
            })
          : i18n('no event yet since startup')
        row('ZMQ', `${snap.zmq_stale ? i18n('STALE') : 'OK'}, ${age}`)
        if (snap.zmq_stale) healthy = false
      }

      lines.push('', i18n('Pool'))
      row('ckpool', snap.ckpool_ok ? i18n('running') : i18n('NOT RUNNING'))
      if (snap.pool) {
        row(i18n('Uptime'), fmtUptime(snap.uptime_seconds))
        row(
          i18n('Workers online'),
          `${snap.pool.workers}  (${i18n('${n} user(s)', { n: String(snap.pool.users) })})`,
        )
        row(
          i18n('Shares'),
          `${i18n('accepted')} ${snap.pool.accepted}, ${i18n('rejected')} ${snap.pool.rejected}`,
        )
        row(
          i18n('Hashrate'),
          `1m ${fmtHashrate(snap.hashrate_hs_1m)}, 5m ${fmtHashrate(snap.hashrate_hs_5m)}, 1h ${fmtHashrate(snap.hashrate_hs_1h)}, 24h ${fmtHashrate(snap.hashrate_hs_24h)}`,
        )
        row(i18n('Best share'), `${i18n('diff')} ${fmtDiff(snap.best_diff)}`)
      }
      const gap = snap.block_submit_attempts - snap.block_submits_confirmed
      row(
        i18n('Block submissions'),
        `${snap.block_submit_attempts} ${i18n('attempted')}, ${snap.block_submits_confirmed} ${i18n('confirmed')}${
          gap > 0
            ? `  ${i18n('WARNING: ${n} unconfirmed, check the Bitcoin logs', { n: String(gap) })}`
            : ''
        }`,
      )
      if (gap > 0) healthy = false

      lines.push('')
      if (snap.clients?.length) {
        lines.push(
          i18n('Connected miners (${n})', { n: String(snap.clients.length) }),
        )
        for (const c of snap.clients)
          row(
            c.workername || `client#${c.id}`,
            `${i18n('diff')} ${fmtDiff(c.diff)}  ${fmtHashrate(c.dsps1 * 4294967296)}${c.useragent ? `  [${c.useragent}]` : ''}`,
          )
      } else lines.push(i18n('Connected miners: none'))

      if (snap.workers?.length) {
        lines.push('', i18n('Best share per worker'))
        for (const w of snap.workers)
          row(
            w.worker,
            `${fmtDiff(w.bestever || w.bestdiff)}${w.idle ? ` (${i18n('idle')})` : ''}`,
          )
      }

      lines.push('')
      if (snap.recent_blocks?.length) {
        lines.push(
          i18n('Blocks found (${n})', { n: String(snap.recent_blocks.length) }),
        )
        for (const b of snap.recent_blocks)
          row(
            `${i18n('height')} ${b.height}`,
            [
              b.found_at.slice(0, 19).replace('T', ' '),
              b.reward_btc ? `${b.reward_btc.toFixed(8)} BTC` : '',
              b.miner ?? '',
              b.hash ? `${b.hash.slice(0, 16)}…` : '',
              b.orphaned_at ? i18n('ORPHANED') : '',
              b.chain && b.chain !== snap.chain?.chain ? `[${b.chain}]` : '',
            ]
              .filter(Boolean)
              .join('  '),
          )
      } else lines.push(i18n('Blocks found: none yet'))
    }

    lines.push('', i18n('Endpoints (the ports miners connect to)'))
    for (const p of ports) {
      row(
        p.label,
        p.assigned === null ? i18n('not assigned yet') : String(p.assigned),
      )
      for (const d of p.domains)
        row(`  ${i18n('domain')}`, `${d.fqdn}:${d.port}`)
    }

    const summary = healthy
      ? i18n('The pool is healthy')
      : i18n('Problems found, see the details')

    return {
      version: '1',
      title: i18n('Pool Status'),
      message: summary,
      result: {
        type: 'single',
        value: lines.join('\n'),
        copyable: true,
        qr: false,
        masked: false,
      },
    }
  },
)
