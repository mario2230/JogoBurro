// Adiciona (de forma idempotente) as permissões de Bluetooth ao AndroidManifest.xml.
// Uso: node scripts/patch-manifest.mjs   (rodado por "npm run setup:android")
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const caminho = 'android/app/src/main/AndroidManifest.xml';
if (!existsSync(caminho)) {
  console.error(`Não achei ${caminho}. Rode antes: npx cap add android`);
  process.exit(1);
}

const linhas = [
  ['android.permission.BLUETOOTH', '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />'],
  ['android.permission.BLUETOOTH_ADMIN', '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />'],
  ['android.permission.ACCESS_FINE_LOCATION', '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />'],
  ['android.permission.BLUETOOTH_SCAN', '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />'],
  ['android.permission.BLUETOOTH_CONNECT', '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />'],
  ['android.permission.BLUETOOTH_ADVERTISE', '<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />'],
  ['android.hardware.bluetooth_le', '<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />'],
];

let xml = readFileSync(caminho, 'utf8');
const novas = linhas.filter(([nome]) => !xml.includes(`"${nome}"`)).map(([, l]) => `    ${l}`);
if (novas.length === 0) {
  console.log('Manifesto já está com as permissões de Bluetooth.');
} else {
  xml = xml.replace('</manifest>', `${novas.join('\n')}\n</manifest>`);
  writeFileSync(caminho, xml);
  console.log(`Adicionadas ${novas.length} linhas ao AndroidManifest.xml.`);
}
