import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.8:0',
  releaseNotes: {
    en_US: 'Initial release of Kamado Pool for StartOS.',
    es_ES: 'Versión inicial de Kamado Pool para StartOS.',
    de_DE: 'Erste Veröffentlichung von Kamado Pool für StartOS.',
    pl_PL: 'Pierwsze wydanie Kamado Pool dla StartOS.',
    fr_FR: 'Première version de Kamado Pool pour StartOS.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
