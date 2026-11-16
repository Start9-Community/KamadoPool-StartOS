import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.9:0',
  releaseNotes: {
    en_US:
      'Fixes Kamado Pool being unable to connect to Bitcoin 31.x, where the Bitcoin RPC health check reported Bitcoin as unreachable. Upstream changes: https://github.com/carbonatedberry/KamadoPool/commits/main',
    es_ES:
      'Corrige que Kamado Pool no pudiera conectarse a Bitcoin 31.x, donde la comprobación de salud de Bitcoin RPC indicaba que Bitcoin era inalcanzable. Cambios en el proyecto original: https://github.com/carbonatedberry/KamadoPool/commits/main',
    de_DE:
      'Behebt, dass Kamado Pool keine Verbindung zu Bitcoin 31.x herstellen konnte und die Zustandsprüfung „Bitcoin RPC“ Bitcoin als nicht erreichbar meldete. Änderungen im Upstream-Projekt: https://github.com/carbonatedberry/KamadoPool/commits/main',
    pl_PL:
      'Naprawia brak połączenia Kamado Pool z Bitcoin 31.x, przy którym kontrola stanu Bitcoin RPC zgłaszała, że Bitcoin jest nieosiągalny. Zmiany w projekcie źródłowym: https://github.com/carbonatedberry/KamadoPool/commits/main',
    fr_FR:
      'Corrige l’impossibilité pour Kamado Pool de se connecter à Bitcoin 31.x, où le contrôle de santé Bitcoin RPC signalait Bitcoin comme injoignable. Modifications du projet amont : https://github.com/carbonatedberry/KamadoPool/commits/main',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
