import { rm } from 'node:fs/promises'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { kamadoRoot, tlsDir, tlsVolumeFiles } from '../utils'
import { tlsCertResult, tlsVisibility } from './showTlsCert'

export const regenTlsCert = sdk.Action.withoutInput(
  // id
  'regen-tls-cert',

  // metadata
  async ({ effects }) => ({
    name: i18n('Regenerate TLS Certificate'),
    description: i18n(
      'Replaces the self-signed stratum TLS certificate with a fresh one and restarts the service. Use this to rotate an expired or untrusted certificate.',
    ),
    warning: i18n(
      'Miners connected via TLS will be disconnected on restart and will need to accept or re-pin the new certificate fingerprint.',
    ),
    allowedStatuses: 'only-running',
    group: null,
    visibility: await tlsVisibility(effects),
  }),

  // the execution function
  async ({ effects }) => {
    for (const f of tlsVolumeFiles)
      await rm(sdk.volumes.main.subpath(f), { force: true })
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'main' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: kamadoRoot,
        readonly: false,
      }),
      'regen-tls-cert',
      (sub) =>
        sub.execFail(['kamado-tls-init.sh'], { env: { TLS_DIR: tlsDir } }),
    )
    await sdk.restart(effects)
    return tlsCertResult()
  },
)
