import { T } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const tlsVisibility = async (effects: T.Effects) =>
  (await storeJson.read((s) => s.tlsEnabled).const(effects))
    ? ('enabled' as const)
    : {
        disabled: i18n('Enable Stratum TLS (Local Network) in Configure first'),
      }

export async function tlsCertResult(): Promise<
  T.ActionResult & { version: '1' }
> {
  const notYet = i18n('(not yet generated, start the service once)')
  const read = (file: string) =>
    sdk.volumes.main
      .readFile(`tls/${file}`, 'utf-8')
      .then((s) => s.toString().trim())
      .catch(() => notYet)
  return {
    version: '1',
    title: i18n('Stratum TLS Certificate'),
    message: i18n(
      'Connect miners with stratum+ssl:// to the Stratum (TLS, Local Network) interface. The certificate is self-signed: paste the PEM into firmware that accepts a custom root, pin the fingerprint, or disable verification. Miners connecting over a public domain do not need any of this, they use the Stratum (TLS, Public Domain) interface and its CA-issued certificate.',
    ),
    result: {
      type: 'group',
      value: [
        {
          name: i18n('Fingerprint (SHA-256)'),
          description: i18n(
            'Use this for fingerprint pinning on miner firmwares that support it. Changes only when the certificate is regenerated.',
          ),
          type: 'single',
          value: await read('fingerprint.txt'),
          copyable: true,
          qr: false,
          masked: false,
        },
        {
          name: i18n('Certificate (PEM)'),
          description: i18n(
            'Full self-signed certificate. Copy the whole block including the BEGIN/END CERTIFICATE markers.',
          ),
          type: 'single',
          value: await read('stratum.crt'),
          copyable: true,
          qr: false,
          masked: false,
        },
      ],
    },
  }
}

export const showTlsCert = sdk.Action.withoutInput(
  // id
  'show-tls-cert',

  // metadata
  async ({ effects }) => ({
    name: i18n('Stratum TLS Certificate'),
    description: i18n(
      'Shows the self-signed stratum TLS certificate: SHA-256 fingerprint for pinning and the full PEM to paste into miner firmware (e.g. the AxeOS "Stratum SSL Cert" field).',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: await tlsVisibility(effects),
  }),

  // the execution function
  async ({ effects }) => tlsCertResult(),
)
