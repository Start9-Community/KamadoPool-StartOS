import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.9:3',
  releaseNotes: {
    en_US:
      'While waiting for you to update Bitcoin, Kamado Pool writes that to its logs once instead of repeating it every second.',
    es_ES:
      'Mientras espera a que actualice Bitcoin, Kamado Pool lo indica una sola vez en sus registros en lugar de repetirlo cada segundo.',
    de_DE:
      'Während Kamado Pool darauf wartet, dass Sie Bitcoin aktualisieren, vermerkt es das einmal in seinen Protokollen, statt es jede Sekunde zu wiederholen.',
    pl_PL:
      'Czekając na aktualizację Bitcoina, Kamado Pool zapisuje to w logach raz, zamiast powtarzać co sekundę.',
    fr_FR:
      "En attendant que vous mettiez Bitcoin à jour, Kamado Pool l'indique une seule fois dans ses journaux au lieu de le répéter chaque seconde.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
