import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { logLevels } from '../utils'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  coinbaseTag: Value.text({
    name: i18n('Coinbase Tag'),
    description: i18n(
      'Short string embedded in the coinbase transaction of solved blocks.',
    ),
    required: true,
    default: '/Kamado/',
    patterns: [],
  }),
  zmqEnabled: Value.toggle({
    name: i18n('ZMQ Block Notifications'),
    description: i18n(
      "Subscribe to Bitcoin's hashblock ZMQ topic for sub-second block detection. RPC polling remains active as a fallback either way.",
    ),
    default: true,
  }),
  tlsEnabled: Value.toggle({
    name: i18n('Stratum TLS (Local Network)'),
    description: i18n(
      'Serve the self-signed certificate on the local-network TLS port. Miners have to trust it (see the Stratum TLS Certificate action) or connect with verification disabled. You do NOT need this for miners connecting over a public domain: attach the domain to the Stratum (TLS, Public Domain) interface instead, and StartOS issues a publicly trusted certificate for it automatically.',
    ),
    default: false,
  }),
  startDiff: Value.number({
    name: i18n('Starting Difficulty'),
    description: i18n(
      'Initial vardiff target for new miner connections. Bitaxe-class miners typically land around 16384.',
    ),
    required: true,
    default: 16384,
    integer: true,
    min: 1,
  }),
  minDiff: Value.number({
    name: i18n('Minimum Difficulty'),
    description: i18n('Floor for the vardiff algorithm.'),
    required: true,
    default: 1000,
    integer: true,
    min: 1,
  }),
  maxDiff: Value.number({
    name: i18n('Maximum Difficulty'),
    description: i18n('Ceiling for the vardiff algorithm. 0 means no cap.'),
    required: true,
    default: 0,
    integer: true,
    min: 0,
  }),
  dropIdle: Value.number({
    name: i18n('Drop Idle (seconds)'),
    description: i18n(
      'Disconnect clients that have not submitted a share in this many seconds. 0 disables the idle disconnect.',
    ),
    required: true,
    default: 0,
    integer: true,
    min: 0,
    units: i18n('seconds'),
  }),
  logLevel: Value.select({
    name: i18n('Log Level'),
    description: i18n('Verbosity of the kamado-api log output.'),
    values: logLevels,
    default: 'info',
  }),
  mempoolExplorerUrl: Value.text({
    name: i18n('Custom Block Explorer URL'),
    description: i18n(
      'Base URL of a self-hosted mempool instance for dashboard links (e.g. https://mempool.example.com). Kamado appends /address/<addr> and /block/<hash>, so the instance must follow the standard mempool.space URL layout. Leave empty to use the public mempool.space.',
    ),
    required: false,
    default: null,
    patterns: [
      {
        regex: '^https?://[^\\s]+$',
        description: i18n(
          'Must be an http:// or https:// URL with no whitespace',
        ),
      },
    ],
  }),
})

export const config = sdk.Action.withInput(
  // id
  'config',

  // metadata
  async ({ effects }) => ({
    name: i18n('Configure'),
    description: i18n(
      'Customize vardiff, TLS, block notifications, logging, and explorer links',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  // form input specification
  inputSpec,

  // optionally pre-fill the input form
  async ({ effects }) => storeJson.read().once(),

  // the execution function
  async ({ effects, input }) => {
    return storeJson.merge(effects, input)
  },
)
