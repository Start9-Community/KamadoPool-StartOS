import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.9:1',
  releaseNotes: {
    en_US:
      "Requires StartOS 0.4.2 or later. Kamado Pool now reads only the RPC credential Bitcoin publishes for connected services, instead of Bitcoin's whole data directory. Requires an up-to-date Bitcoin; update Bitcoin first if StartOS reports it as out of range.",
    es_ES:
      'Requiere StartOS 0.4.2 o posterior. Kamado Pool ahora solo lee la credencial RPC que Bitcoin publica para los servicios conectados, en lugar de todo el directorio de datos de Bitcoin. Requiere una versión actualizada de Bitcoin; si StartOS indica que está fuera de rango, actualice Bitcoin primero.',
    de_DE:
      'Erfordert StartOS 0.4.2 oder neuer. Kamado Pool liest jetzt nur noch die RPC-Zugangsdaten, die Bitcoin für verbundene Dienste bereitstellt, statt des gesamten Bitcoin-Datenverzeichnisses. Erfordert ein aktuelles Bitcoin; meldet StartOS die Version als außerhalb des Bereichs, aktualisieren Sie zuerst Bitcoin.',
    pl_PL:
      'Wymaga StartOS 0.4.2 lub nowszego. Kamado Pool odczytuje teraz tylko dane uwierzytelniające RPC, które Bitcoin udostępnia połączonym usługom, zamiast całego katalogu danych Bitcoin. Wymaga aktualnej wersji Bitcoin; jeśli StartOS zgłasza ją jako spoza zakresu, najpierw zaktualizuj Bitcoin.',
    fr_FR:
      "Nécessite StartOS 0.4.2 ou version ultérieure. Kamado Pool ne lit plus que l'identifiant RPC que Bitcoin publie pour les services connectés, au lieu de tout le répertoire de données de Bitcoin. Nécessite une version à jour de Bitcoin ; si StartOS la signale hors plage, mettez d'abord Bitcoin à jour.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
