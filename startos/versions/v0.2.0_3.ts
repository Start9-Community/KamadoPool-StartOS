import { IMPOSSIBLE, VersionInfo, YAML } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { LogLevel } from '../utils'

type LegacyConfig = {
  tls?: { enabled?: string }
  'zmq-enabled'?: boolean
  advanced?: {
    'pool-identifier'?: string
    startdiff?: number
    mindiff?: number
    maxdiff?: number
    dropidle?: number
    'log-level'?: LogLevel
    'mempool-explorer'?: { type?: string; url?: string }
  }
}

export const v0_2_0 = VersionInfo.of({
  version: '0.2.0:3',
  releaseNotes: {
    en_US:
      'StartOS 0.4.0 port: stratum is exposed directly on the LAN as a raw TCP interface, Bitcoin is reached over the internal network bridge with cookie authentication, and settings moved from Config to the Configure action. Existing settings, found-block history, and the stratum TLS certificate are migrated automatically.',
    es_ES:
      'Adaptación a StartOS 0.4.0: Stratum se expone directamente en la LAN como interfaz TCP, Bitcoin se alcanza a través del puente de red interno con autenticación por cookie, y la configuración se movió a la acción Configurar. Los ajustes existentes, el historial de bloques y el certificado TLS se migran automáticamente.',
    de_DE:
      'Portierung auf StartOS 0.4.0: Stratum wird direkt im LAN als TCP-Schnittstelle bereitgestellt, Bitcoin wird über die interne Netzwerk-Bridge mit Cookie-Authentifizierung erreicht, und die Einstellungen sind in die Aktion „Konfigurieren“ umgezogen. Bestehende Einstellungen, Blockhistorie und das TLS-Zertifikat werden automatisch migriert.',
    pl_PL:
      'Port na StartOS 0.4.0: Stratum jest udostępniany bezpośrednio w sieci LAN jako interfejs TCP, Bitcoin jest osiągany przez wewnętrzny mostek sieciowy z uwierzytelnianiem cookie, a ustawienia przeniesiono do akcji Konfiguruj. Istniejące ustawienia, historia bloków i certyfikat TLS są migrowane automatycznie.',
    fr_FR:
      'Portage vers StartOS 0.4.0 : Stratum est exposé directement sur le LAN comme interface TCP, Bitcoin est atteint via le pont réseau interne avec authentification par cookie, et les réglages ont migré vers l’action Configurer. Les réglages existants, l’historique des blocs et le certificat TLS sont migrés automatiquement.',
  },
  migrations: {
    up: async ({ effects }) => {
      const configYaml: LegacyConfig | undefined = await sdk.volumes.main
        .readFile('start9/config.yaml')
        .then((c) => c.toString('utf-8'))
        .then(YAML.parse, () => undefined)
      if (!configYaml) return

      const adv = configYaml.advanced ?? {}
      const mempool = adv['mempool-explorer']
      await storeJson.merge(effects, {
        coinbaseTag: adv['pool-identifier'] ?? '/Kamado/',
        startDiff: adv.startdiff ?? 16384,
        minDiff: adv.mindiff ?? 1000,
        maxDiff: adv.maxdiff ?? 0,
        dropIdle: adv.dropidle ?? 0,
        logLevel: adv['log-level'] ?? 'info',
        zmqEnabled: configYaml['zmq-enabled'] ?? true,
        tlsEnabled: configYaml.tls?.enabled === 'enabled',
        mempoolExplorerUrl:
          mempool?.type === 'custom' && mempool.url ? mempool.url : null,
      })
      await rm(sdk.volumes.main.subpath('start9'), { recursive: true })
    },
    down: IMPOSSIBLE,
  },
})
