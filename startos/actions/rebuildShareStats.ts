import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { uiPort } from '../utils'

export const rebuildShareStats = sdk.Action.withoutInput(
  // id
  'rebuild-share-stats',

  // metadata
  async ({ effects }) => ({
    name: i18n('Rebuild Share Statistics'),
    description: i18n(
      'Recounts the all-time share statistics, the difficulty distribution and rejection reasons on the Stats page, by rereading CKPool’s log from the beginning. Use this if those totals look wrong or reset. The stored totals are only replaced when the log accounts for more shares than they do, so this can add history back but never erase it.',
    ),
    warning: i18n(
      'On a pool with a long history this reads millions of log lines and can take a while. The pool keeps mining throughout.',
    ),
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  // the execution function
  async ({ effects }) => {
    // no timeout: the scan is unbounded on a large log
    const res = await fetch(
      `http://127.0.0.1:${uiPort}/api/admin/rebuild-share-stats`,
      { method: 'POST' },
    )
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ adopted?: boolean; shares_in_log?: number }>)
          : null,
      )
      .catch(() => null)
    const title = i18n('Rebuild Share Statistics')

    if (!res)
      return {
        version: '1',
        title,
        message: i18n(
          'Failed to rebuild share statistics, the Kamado API did not respond',
        ),
        result: null,
      }

    const shares = Number(res.shares_in_log ?? 0)
    return {
      version: '1',
      title,
      message: res.adopted
        ? i18n('Share statistics rebuilt from the CKPool log')
        : i18n('Share statistics left unchanged'),
      result: {
        type: 'single',
        value: res.adopted
          ? i18n(
              '${shares} accepted shares were counted in the log and are now reflected in the all-time difficulty distribution and rejection reasons on the Stats page.',
              { shares: String(shares) },
            )
          : i18n(
              'The log accounts for ${shares} accepted shares, which is no more than the stored totals already hold, so nothing was replaced.',
              { shares: String(shares) },
            ),
        copyable: false,
        qr: false,
        masked: false,
      },
    }
  },
)
