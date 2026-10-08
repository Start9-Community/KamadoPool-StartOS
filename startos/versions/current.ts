import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.8:1',
  releaseNotes: {
    en_US: `- Pool Status shows its report in a multi-line field that keeps its columns and line breaks.
- Stratum TLS Certificate shows the certificate with its line breaks, and offers it as a stratum.crt download.
- Reset Block Latency asks for confirmation before running.
- Rebuild Share Statistics' confirmation names the statistics it can replace.
- In Configure, Starting Difficulty explains when it applies, and Custom Block Explorer URL shows the paths Kamado appends.
- Configure no longer has a Log Level field.
- Bitcoin must be at least 28.4:29, 29.4:16, 30.3:16 or 31.1:16, depending on its major version. Bitcoin Knots (pre-RDTS) 29.3:29 or later also works.`,
    es_ES: `- Estado del pool muestra su informe en un campo de varias líneas que conserva sus columnas y saltos de línea.
- Certificado TLS de Stratum muestra el certificado con sus saltos de línea y lo ofrece como descarga stratum.crt.
- Restablecer latencia de bloques pide confirmación antes de ejecutarse.
- La confirmación de Reconstruir estadísticas de participaciones indica qué estadísticas puede sustituir.
- En Configurar, Dificultad inicial explica cuándo se aplica, y URL de explorador de bloques personalizado muestra las rutas que añade Kamado.
- Configurar ya no tiene el campo Nivel de registro.
- Bitcoin debe ser al menos la versión 28.4:29, 29.4:16, 30.3:16 o 31.1:16, según su versión principal. También funciona Bitcoin Knots (pre-RDTS) 29.3:29 o posterior.`,
    de_DE: `- Pool-Status zeigt seinen Bericht in einem mehrzeiligen Feld, das Spalten und Zeilenumbrüche beibehält.
- Stratum-TLS-Zertifikat zeigt das Zertifikat mit seinen Zeilenumbrüchen und bietet es als Download stratum.crt an.
- „Blocklatenz zurücksetzen“ fragt vor der Ausführung nach einer Bestätigung.
- Die Bestätigung von „Share-Statistiken neu aufbauen“ nennt die Statistiken, die ersetzt werden können.
- In „Konfigurieren“ erklärt „Anfangsschwierigkeit“, wann sie gilt, und „Benutzerdefinierte Block-Explorer-URL“ zeigt die Pfade, die Kamado anhängt.
- „Konfigurieren“ hat kein Feld „Protokollstufe“ mehr.
- Bitcoin muss je nach Hauptversion mindestens 28.4:29, 29.4:16, 30.3:16 oder 31.1:16 sein. Bitcoin Knots (pre-RDTS) ab 29.3:29 funktioniert ebenfalls.`,
    pl_PL: `- Stan puli pokazuje raport w wielowierszowym polu, które zachowuje kolumny i podziały wierszy.
- Certyfikat TLS Stratum pokazuje certyfikat z podziałami wierszy i udostępnia go do pobrania jako stratum.crt.
- „Zresetuj opóźnienie bloków” prosi o potwierdzenie przed uruchomieniem.
- Potwierdzenie „Odbuduj statystyki udziałów” wymienia statystyki, które może zastąpić.
- W „Konfiguruj” opis „Trudność początkowa” wyjaśnia, kiedy ma zastosowanie, a „Niestandardowy URL eksploratora bloków” pokazuje ścieżki, które dołącza Kamado.
- „Konfiguruj” nie ma już pola „Poziom logowania”.
- Bitcoin musi być co najmniej w wersji 28.4:29, 29.4:16, 30.3:16 lub 31.1:16, zależnie od wersji głównej. Działa też Bitcoin Knots (pre-RDTS) 29.3:29 lub nowszy.`,
    fr_FR: `- État du pool affiche son rapport dans un champ multiligne qui conserve ses colonnes et ses retours à la ligne.
- Certificat TLS Stratum affiche le certificat avec ses retours à la ligne et le propose en téléchargement sous le nom stratum.crt.
- Réinitialiser la latence des blocs demande une confirmation avant de s’exécuter.
- La confirmation de Reconstruire les statistiques de parts indique les statistiques qu’elle peut remplacer.
- Dans Configurer, Difficulté initiale explique quand elle s’applique, et URL d’explorateur de blocs personnalisé indique les chemins qu’ajoute Kamado.
- Configurer n’a plus de champ Niveau de journalisation.
- Bitcoin doit être au moins en version 28.4:29, 29.4:16, 30.3:16 ou 31.1:16, selon sa version majeure. Bitcoin Knots (pre-RDTS) 29.3:29 ou plus récent fonctionne aussi.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
