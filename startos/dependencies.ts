import { autoconfig } from 'bitcoin-core-startos/startos/actions/config/autoconfig'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
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

  return {
    bitcoind: {
      kind: 'running',
      versionRange: '>=28.4:13',
      healthChecks: ['bitcoind', 'sync-progress'],
    },
  }
})
