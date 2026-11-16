import { autoconfig } from 'bitcoin-core-startos/startos/actions/config/autoconfig'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { bitcoindDescription } from './manifest/i18n'
import { sdk } from './sdk'

const bitcoind = sdk.Dependency.required('bitcoind', {
  description: bitcoindDescription,
  metadata: {
    title: 'Bitcoin',
    icon: 'https://raw.githubusercontent.com/Start9Labs/bitcoin-core-startos/feec0b1dae42961a257948fe39b40caf8672fce1/dep-icon.svg',
  },
  versionRange:
    '(>=28.4:29 && <29) || (>=29.4:16 && <30) || (>=30.3:16 && <31) || >=31.1:16 || >=#knotsprerdts:29.3:29',
  kind: 'running',
  healthChecks: ['bitcoind', 'sync-progress'],
}).withInit(async (effects) => {
  // Kamado falls back to RPC polling without ZMQ, so the task is important, not critical
  if (await storeJson.read((s) => s.zmqEnabled).const(effects))
    await sdk.action.createTask(effects, 'bitcoind', autoconfig, 'important', {
      input: {
        kind: 'partial',
        accept: [{ zmqEnabled: true }],
        set: { zmqEnabled: true },
      },
      when: { condition: 'input-not-matches', once: false },
      reason: i18n(
        'Kamado Pool uses ZMQ block notifications for sub-second stale-work detection, every second of stale work in solo mode is hashrate burned on a dead block.',
      ),
    })
  else await sdk.action.clearTask(effects, `bitcoind:${autoconfig.id}`)
})

export const dependencies = sdk.Dependencies.of().addDependency(bitcoind)
