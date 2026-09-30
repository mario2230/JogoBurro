// Apply Android fixes to the legacy BLE peripheral plugin after Capacitor copies it.
// Usage: node scripts/patch-ble-peripheral.mjs (after `npx cap sync android`)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const caminho = 'android/capacitor-cordova-android-plugins/src/main/java/com/megster/cordova/ble/peripheral/BLEPeripheralPlugin.java';
if (!existsSync(caminho)) {
  console.error(`Não achei ${caminho}. Rode antes: npx cap sync android`);
  process.exit(1);
}

let java = readFileSync(caminho, 'utf8');
let alterado = false;

function substituir(original, corrigido, descricao) {
  if (java.includes(corrigido)) return;
  if (!java.includes(original)) {
    console.error(`Não encontrei o trecho esperado para: ${descricao}`);
    process.exit(1);
  }
  java = java.replace(original, corrigido);
  alterado = true;
}

function substituirRegex(original, corrigido, aplicado, descricao) {
  if (aplicado.test(java)) return;
  if (!original.test(java)) {
    console.error(`Não encontrei o trecho esperado para: ${descricao}`);
    process.exit(1);
  }
  java = java.replace(original, corrigido);
  alterado = true;
}

substituir(
  `        LOG.d(TAG, "action = " + action);\n\n        if (bluetoothAdapter == null) {`,
  `        LOG.d(TAG, "action = " + action);

        if (action.equals(SET_CHARACTERISTIC_VALUE_CHANGED_LISTENER)) {
            characteristicValueChangedCallback = callbackContext;
            return true;
        }

        if (action.equals(SET_BLUETOOTH_STATE_CHANGED_LISTENER)) {
            if (this.stateCallback != null) {
                callbackContext.error("State callback already registered.");
            } else {
                this.stateCallback = callbackContext;
            }
            return true;
        }

        if (bluetoothAdapter == null || gattServer == null) {`,
  'adiamento da abertura GATT até depois das permissões',
);

substituir(
  `            bluetoothAdapter = bluetoothManager.getAdapter();

            boolean hardwareSupportsPeripherals = bluetoothAdapter.isMultipleAdvertisementSupported();`,
  `            bluetoothAdapter = bluetoothManager.getAdapter();
            if (bluetoothAdapter == null) {
                callbackContext.error("Bluetooth adapter is unavailable on this device.");
                return true;
            }

            boolean hardwareSupportsPeripherals = bluetoothAdapter.isMultipleAdvertisementSupported();`,
  'checagem de adaptador Bluetooth ausente',
);

substituir(
  `            gattServer = bluetoothManager.openGattServer(cordova.getContext(), gattServerCallback);`,
  `            try {
                gattServer = bluetoothManager.openGattServer(cordova.getContext(), gattServerCallback);
            } catch (SecurityException e) {
                bluetoothAdapter = null;
                callbackContext.error("Bluetooth permission is required to open the GATT server: " + e.getMessage());
                return true;
            }
            if (gattServer == null) {
                bluetoothAdapter = null;
                callbackContext.error("Android could not open a BLE GATT server. This device or emulator may not support BLE peripheral mode.");
                return true;
            }
            if (this.stateCallback != null) {
                addStateListener();
                sendBluetoothStateChange(bluetoothAdapter.getState());
            }`,
  'tratamento do servidor GATT nulo',
);

substituir('builder.setIncludeDeviceName(true);', 'builder.setIncludeDeviceName(false);', 'limite do anúncio BLE');

substituirRegex(
  /            Log\.d\(TAG, "onStartFailure"\);\r?\n\s*if \(advertisingStartedCallback != null\) \{\r?\n\s*advertisingStartedCallback\.error\(errorCode\);\r?\n\s*\}/,
  [
    '            Log.d(TAG, "onStartFailure errorCode=" + errorCode);',
    '            String message;',
    '            switch (errorCode) {',
    '                case 1:',
    '                    message = "Bluetooth advertisement data is too large. Disable the device name and keep only the service UUID.";',
    '                    break;',
    '                case 2:',
    '                    message = "Too many Bluetooth advertisers are active on this device.";',
    '                    break;',
    '                case 3:',
    '                    message = "Bluetooth advertising is already active.";',
    '                    break;',
    '                case 4:',
    '                    message = "Android reported an internal Bluetooth advertising error.";',
    '                    break;',
    '                case 5:',
    '                    message = "This device does not support Bluetooth LE advertising.";',
    '                    break;',
    '                default:',
    '                    message = "Bluetooth advertising failed with error code " + errorCode + ".";',
    '            }',
    '            if (advertisingStartedCallback != null) {',
    '                advertisingStartedCallback.error(message);',
    '            }',
  ].join('\n'),
  /onStartFailure errorCode=/,
  'mensagens legíveis para falhas de anúncio BLE',
);

if (alterado) {
  writeFileSync(caminho, java);
  console.log('Correções BLE Android aplicadas.');
} else {
  console.log('Correções BLE Android já estão aplicadas.');
}
