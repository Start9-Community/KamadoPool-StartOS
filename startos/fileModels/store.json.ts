import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  z.looseObject({
    coinbaseTag: z.string().catch('/Kamado/'),
    startDiff: z.number().int().min(1).catch(16384),
    minDiff: z.number().int().min(1).catch(1000),
    maxDiff: z.number().int().min(0).catch(0),
    dropIdle: z.number().int().min(0).catch(0),
    zmqEnabled: z.boolean().catch(true),
    tlsEnabled: z.boolean().catch(false),
    mempoolExplorerUrl: z.string().nullable().catch(null),
  }),
)
