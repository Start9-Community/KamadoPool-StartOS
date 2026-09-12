import { FileHelper } from '@start9labs/start-sdk'
import { manifest as bitcoindManifest } from 'bitcoin-core-startos/startos/manifest'
import { mkdir, writeFile } from 'node:fs/promises'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  bitcoindBridge,
  btcMountpoint,
  ckpoolLogDir,
  ckpoolLogFile,
  ckpoolRoot,
  ckpoolSocketDir,
  ckpoolTlsLoopbackPort,
  fetchJson,
  HealthPayload,
  healthUrl,
  kamadoDataDir,
  kamadoDbPath,
  kamadoRoot,
  parseCookie,
  stratumInternalPort,
  stratumPublicTlsHostId,
  stratumServers,
  stratumServerUrls,
  stratumTlsInternalPort,
  stunnelConfDir,
  tlsDir,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting Kamado Pool!')

  const store = await storeJson
    .read((s) => ({
      coinbaseTag: s.coinbaseTag,
      startDiff: s.startDiff,
      minDiff: s.minDiff,
      maxDiff: s.maxDiff,
      dropIdle: s.dropIdle,
      logLevel: s.logLevel,
      zmqEnabled: s.zmqEnabled,
      tlsEnabled: s.tlsEnabled,
      mempoolExplorerUrl: s.mempoolExplorerUrl,
    }))
    .const(effects)
  if (!store) throw new Error('No store.json')

  const bitcoind = await bitcoindBridge(effects)
  const tlsDomains = await sdk.host
    .get(effects, { hostId: stratumPublicTlsHostId }, (host) =>
      Object.keys(host?.publicDomains ?? {}).sort(),
    )
    .const()

  const kamadoSub = sdk.SubContainer.of(
    effects,
    { imageId: 'main' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: kamadoRoot,
        readonly: false,
      })
      .mountVolume({
        volumeId: 'ckpool',
        subpath: null,
        mountpoint: ckpoolRoot,
        readonly: false,
      })
      .mountDependency<typeof bitcoindManifest>({
        dependencyId: 'bitcoind',
        volumeId: 'main',
        subpath: null,
        mountpoint: btcMountpoint,
        readonly: true,
      }),
    'kamado',
  )
  const rootfs = await kamadoSub.rootfs

  const cookie = parseCookie(
    await FileHelper.string(`${rootfs}${btcMountpoint}/.cookie`)
      .read()
      .const(effects),
  )

  // Placeholders keep the dashboard up while bitcoind is absent; the watches above heal main once it appears
  const rpcAddr = bitcoind.rpc ?? '127.0.0.1:8332'
  const rpcUser = cookie?.user ?? '__cookie__'
  const rpcPassword = cookie?.password ?? 'bitcoind-not-yet-available'
  const zmqBlock = bitcoind.zmqBlock ? `tcp://${bitcoind.zmqBlock}` : ''

  // Rendered onto the subcontainer rootfs so the RPC credentials never land on a volume.
  // kamado-ckpool-run.sh fills in @SELFTEST_ADDRESS@ once it knows the chain.
  await mkdir(`${rootfs}/etc/ckpool`, { recursive: true })
  await writeFile(
    `${rootfs}/etc/ckpool/ckpool.conf.template`,
    JSON.stringify(
      {
        btcd: [
          { url: rpcAddr, auth: rpcUser, pass: rpcPassword, notify: false },
        ],
        btcaddress: '@SELFTEST_ADDRESS@',
        btcsig: store.coinbaseTag,
        blockpoll: 100,
        update_interval: 30,
        serverurl: stratumServerUrls,
        mindiff: store.minDiff,
        startdiff: store.startDiff,
        maxdiff: store.maxDiff,
        dropidle: store.dropIdle,
        zmqblock: zmqBlock || 'tcp://127.0.0.1:28332',
        logdir: ckpoolLogDir,
      },
      null,
      2,
    ),
  )

  if (store.tlsEnabled) {
    await mkdir(`${rootfs}${stunnelConfDir}`, { recursive: true })
    await writeFile(
      `${rootfs}${stunnelConfDir}/stratum.conf`,
      [
        'foreground = yes',
        'pid =',
        'output = /dev/stdout',
        'debug = 5',
        'sslVersion = all',
        'options = NO_SSLv2',
        'options = NO_SSLv3',
        'options = NO_TLSv1',
        'options = NO_TLSv1_1',
        '',
        '[stratum]',
        `accept = 0.0.0.0:${stratumTlsInternalPort}`,
        `connect = 127.0.0.1:${ckpoolTlsLoopbackPort}`,
        `cert = ${tlsDir}/stratum.pem`,
        'verify = 0',
        '',
      ].join('\n'),
    )
  }

  const apiUnreachable = {
    result: 'failure',
    message: i18n('Kamado API is unreachable, service may be down'),
  } as const

  return sdk.Daemons.of(effects)
    .addOneshot('dirs', {
      subcontainer: kamadoSub,
      exec: {
        command: [
          'mkdir',
          '-p',
          kamadoDataDir,
          tlsDir,
          ckpoolLogDir,
          ckpoolSocketDir,
        ],
      },
      requires: [],
    })
    .addDaemon('api', {
      subcontainer: kamadoSub,
      exec: {
        command: ['kamado-api'],
        env: {
          LISTEN_ADDR: `:${uiPort}`,
          CKPOOL_SOCKDIR: ckpoolSocketDir,
          CKPOOL_LOGFILE: ckpoolLogFile,
          DB_PATH: kamadoDbPath,
          BITCOIN_RPC_URL: `http://${rpcAddr}`,
          BITCOIN_RPC_USER: rpcUser,
          BITCOIN_RPC_PASSWORD: rpcPassword,
          POLL_INTERVAL: '5s',
          KAMADO_LOG_LEVEL: store.logLevel,
          BITCOIN_ZMQ_BLOCK: store.zmqEnabled ? zmqBlock : '',
          MEMPOOL_BASE_URL: store.mempoolExplorerUrl ?? '',
          STRATUM_SERVERS: JSON.stringify(stratumServers(tlsDomains)),
        },
      },
      ready: {
        display: i18n('Web Dashboard'),
        gracePeriod: 15_000,
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The Kamado dashboard is reachable'),
            errorMessage: i18n('The Kamado dashboard is not reachable'),
          }),
      },
      requires: ['dirs'],
    })
    .addDaemon('ckpool', {
      subcontainer: kamadoSub,
      exec: {
        command: ['kamado-ckpool-run.sh'],
        env: {
          BITCOIN_RPC_URL: `http://${rpcAddr}`,
          BITCOIN_RPC_USER: rpcUser,
          BITCOIN_RPC_PASSWORD: rpcPassword,
          CKPOOL_SOCKDIR: ckpoolSocketDir,
        },
      },
      ready: {
        display: i18n('Stratum Server'),
        gracePeriod: 30_000,
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, stratumInternalPort, {
            successMessage: i18n('The stratum server is accepting connections'),
            errorMessage: i18n(
              'The stratum server is not accepting connections',
            ),
          }),
      },
      requires: ['dirs'],
    })
    .addHealthCheck('bitcoin', {
      ready: {
        display: i18n('Bitcoin RPC'),
        fn: async () => {
          const h = await fetchJson<HealthPayload>(healthUrl)
          if (!h) return apiUnreachable
          if (h.bitcoin)
            return { result: 'success', message: i18n('Connected to Bitcoin') }
          return {
            result: 'failure',
            message: h.last_error
              ? `${i18n('Bitcoin RPC is unreachable')} (${h.last_error})`
              : i18n('Bitcoin RPC is unreachable'),
          }
        },
      },
      requires: ['api'],
    })
    .addHealthCheck('submit-gap', {
      ready: {
        display: i18n('Block Submission'),
        fn: async () => {
          const h = await fetchJson<HealthPayload>(healthUrl)
          if (!h) return apiUnreachable
          if (!h.submit_gap)
            return {
              result: 'success',
              message: i18n('All block submissions confirmed'),
            }
          return {
            result: 'failure',
            message: i18n(
              '${gap} block(s) submitted to Bitcoin but not confirmed, check the Bitcoin logs',
              { gap: String(h.submit_gap) },
            ),
          }
        },
      },
      requires: ['api'],
    })
    .addHealthCheck('zmq', () =>
      store.zmqEnabled
        ? {
            ready: {
              display: i18n('ZMQ Block Feed'),
              fn: async () => {
                const h = await fetchJson<HealthPayload>(healthUrl)
                if (!h) return apiUnreachable
                if (h.zmq_stale)
                  return {
                    result: 'failure',
                    message: i18n(
                      'ZMQ block feed is stale, block notifications are falling back to RPC polling',
                    ),
                  }
                return {
                  result: 'success',
                  message: i18n('ZMQ block notifications are flowing'),
                }
              },
            },
            requires: ['api'],
          }
        : null,
    )
    .addOneshot('tls-cert', () =>
      store.tlsEnabled
        ? {
            subcontainer: kamadoSub,
            exec: {
              command: ['kamado-tls-init.sh'],
              env: { TLS_DIR: tlsDir },
            },
            requires: ['dirs'],
          }
        : null,
    )
    .addDaemon('stunnel', () =>
      store.tlsEnabled
        ? {
            subcontainer: kamadoSub,
            exec: {
              command: ['stunnel4', `${stunnelConfDir}/stratum.conf`],
            },
            ready: {
              display: i18n('Stratum TLS'),
              fn: () =>
                sdk.healthCheck.checkPortListening(
                  effects,
                  stratumTlsInternalPort,
                  {
                    successMessage: i18n(
                      'TLS stratum is accepting connections',
                    ),
                    errorMessage: i18n(
                      'TLS stratum is not accepting connections',
                    ),
                  },
                ),
            },
            requires: ['tls-cert'],
          }
        : null,
    )
})
