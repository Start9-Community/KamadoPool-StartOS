import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.9:2',
  releaseNotes: {
    en_US:
      'With a Bitcoin too old to publish the RPC credential Kamado Pool reads, Kamado Pool no longer fails to start: the dashboard stays up and the Bitcoin RPC check tells you to update Bitcoin.',
    es_ES:
      'Con un Bitcoin demasiado antiguo para publicar la credencial RPC que Kamado Pool lee, Kamado Pool ya no falla al iniciarse: el panel sigue disponible y la comprobación RPC de Bitcoin le indica que actualice Bitcoin.',
    de_DE:
      'Mit einem Bitcoin, das zu alt ist, um die von Kamado Pool gelesenen RPC-Zugangsdaten bereitzustellen, startet Kamado Pool nicht mehr fehlerhaft: Das Dashboard bleibt erreichbar, und die Prüfung Bitcoin-RPC fordert Sie auf, Bitcoin zu aktualisieren.',
    pl_PL:
      'Gdy Bitcoin jest zbyt stary, by udostępniać dane uwierzytelniające RPC odczytywane przez Kamado Pool, Kamado Pool nie kończy już uruchamiania błędem: panel pozostaje dostępny, a kontrola RPC Bitcoina prosi o aktualizację Bitcoina.',
    fr_FR:
      "Avec un Bitcoin trop ancien pour publier l'identifiant RPC que Kamado Pool lit, Kamado Pool n'échoue plus au démarrage : le tableau de bord reste disponible et la vérification RPC Bitcoin vous invite à mettre Bitcoin à jour.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
