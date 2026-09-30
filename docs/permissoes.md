# Permissões

## Android
Adicionadas por `npm run setup:android` (`scripts/patch-manifest.mjs`) em `android/app/src/main/AndroidManifest.xml`:

| Permissão | Para quê | Versão |
|---|---|---|
| `BLUETOOTH_SCAN` (`neverForLocation`) | procurar partidas | Android 12+ |
| `BLUETOOTH_CONNECT` | conectar e trocar mensagens | Android 12+ |
| `BLUETOOTH_ADVERTISE` | anunciar a partida (anfitrião) | Android 12+ |
| `BLUETOOTH`, `BLUETOOTH_ADMIN` | Bluetooth em versões antigas | até Android 11 |
| `ACCESS_FINE_LOCATION` | exigida pelo scan BLE | até Android 11 |
| `uses-feature bluetooth_le` | o aparelho precisa ter BLE | todas |

Em tempo de execução: `BleClient.initialize()` pede SCAN e CONNECT; o anfitrião também pede ADVERTISE por `cordova-plugin-android-permissions`. Permissão negada ou Bluetooth desligado geram mensagens claras (`ErroBluetooth`), e o app tenta ligar o Bluetooth no Android.

## iOS (se for portar)
Adicionar ao `Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>O Burro usa Bluetooth para jogar com pessoas próximas.</string>
```
E, para o anfitrião em segundo plano, o modo `bluetooth-peripheral`. O iOS não foi testado neste projeto.
