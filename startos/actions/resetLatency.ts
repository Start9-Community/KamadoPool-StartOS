import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { uiPort } from '../utils'

export const resetLatency = sdk.Action.withoutInput(
  // id
  'reset-latency',

  // metadata
  async ({ effects }) => ({
    name: i18n('Reset Block Latency'),
    description: i18n(
      'Zeroes the block-update latency counters (avg, last, wasted work, block count). Use this after tuning ZMQ or ckpool to start fresh measurements.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  // the execution function
  async ({ effects }) => {
    const ok = await fetch(
      `http://127.0.0.1:${uiPort}/api/admin/reset-latency`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      },
    )
      .then((r) => r.ok)
      .catch(() => false)

    return {
      version: '1',
      title: i18n('Reset Block Latency'),
      message: ok
        ? i18n('Block latency stats reset to zero')
        : i18n('Failed to reset latency stats, the Kamado API did not respond'),
      result: null,
    }
  },
)
