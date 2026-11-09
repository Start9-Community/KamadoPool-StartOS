import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.8:2',
  releaseNotes: {
    en_US: "Miners can now connect over the server's IPv6 addresses.",
    es_ES:
      'Los mineros ahora pueden conectarse a través de las direcciones IPv6 del servidor.',
    de_DE:
      'Miner können sich jetzt über die IPv6-Adressen des Servers verbinden.',
    pl_PL: 'Koparki mogą teraz łączyć się przez adresy IPv6 serwera.',
    fr_FR:
      'Les mineurs peuvent désormais se connecter via les adresses IPv6 du serveur.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
