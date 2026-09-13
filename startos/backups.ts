import { sdk } from './sdk'

// ckpool's log is included on purpose: the database holds a read cursor into it
export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) => sdk.Backups.ofVolumes('main', 'ckpool'),
)
