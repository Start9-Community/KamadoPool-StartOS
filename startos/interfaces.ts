import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  ckpoolPublicTlsPort,
  stratumExternalPort,
  stratumPublicTlsExternalPort,
  stratumTlsExternalPort,
  stratumHostId,
  stratumInternalPort,
  stratumPublicTlsHostId,
  stratumTlsHostId,
  stratumTlsInternalPort,
  uiHostId,
  uiPort,
} from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const uiMultiOrigin = await sdk.MultiHost.of(effects, uiHostId).bindPort(
    uiPort,
    { protocol: 'http' },
  )
  const ui = sdk.createInterface(effects, {
    name: i18n('Web Dashboard'),
    id: 'ui',
    description: i18n(
      'Real-time Kamado Pool dashboard (hashrate, miners, blocks, best shares)',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const stratumOrigin = await sdk.MultiHost.of(effects, stratumHostId).bindPort(
    stratumInternalPort,
    {
      protocol: null,
      preferredExternalPort: stratumExternalPort,
      addSsl: null,
      secure: { ssl: false },
    },
  )
  const stratum = sdk.createInterface(effects, {
    name: i18n('Stratum'),
    id: 'stratum',
    description: i18n(
      'Plaintext stratum endpoint. Point miners here with their Bitcoin payout address as the username',
    ),
    type: 'api',
    masked: false,
    schemeOverride: { ssl: 'stratum+ssl', noSsl: 'stratum+tcp' },
    username: null,
    path: '',
    query: {},
  })

  // stunnel terminates TLS inside the container, so the OS sees a raw TCP port
  const tlsOrigin = await sdk.MultiHost.of(effects, stratumTlsHostId).bindPort(
    stratumTlsInternalPort,
    {
      protocol: null,
      preferredExternalPort: stratumTlsExternalPort,
      addSsl: null,
      secure: { ssl: false },
    },
  )
  const stratumTls = sdk.createInterface(effects, {
    name: i18n('Stratum (TLS, Local Network)'),
    id: 'stratum-tls',
    description: i18n(
      'TLS-encrypted stratum endpoint for miners on your local network, using the self-signed certificate (see the Stratum TLS Certificate action). Do not attach a public domain here, StartOS cannot issue a certificate for this endpoint; use Stratum (TLS, Public Domain) instead',
    ),
    type: 'api',
    masked: false,
    schemeOverride: { ssl: 'stratum+ssl', noSsl: 'stratum+ssl' },
    username: null,
    path: '',
    query: {},
  })

  // StartOS only issues ACME certificates for bindings it terminates TLS for, hence `addSsl`;
  // `secure: null` publishes the TLS port alone
  const publicTlsOrigin = await sdk.MultiHost.of(
    effects,
    stratumPublicTlsHostId,
  ).bindPort(ckpoolPublicTlsPort, {
    protocol: null,
    preferredExternalPort: ckpoolPublicTlsPort,
    addSsl: {
      preferredExternalPort: stratumPublicTlsExternalPort,
      alpn: null,
      addXForwardedHeaders: false,
      auth: null,
    },
    secure: null,
  })
  const stratumPublicTls = sdk.createInterface(effects, {
    name: i18n('Stratum (TLS, Public Domain)'),
    id: 'stratum-tls-public',
    description: i18n(
      'TLS-encrypted stratum endpoint for miners connecting over the internet. Attach a domain here and StartOS issues a Let’s Encrypt certificate for it, which any miner validates with nothing pasted in',
    ),
    type: 'api',
    masked: false,
    schemeOverride: { ssl: 'stratum+ssl', noSsl: 'stratum+ssl' },
    username: null,
    path: '',
    query: {},
  })

  return [
    await uiMultiOrigin.export([ui]),
    await stratumOrigin.export([stratum]),
    await tlsOrigin.export([stratumTls]),
    await publicTlsOrigin.export([stratumPublicTls]),
  ]
})
