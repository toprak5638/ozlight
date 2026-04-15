// SP630E BLE Bağlantı Katmanı
// Web Bluetooth (Chrome/Bluefy) ve Capacitor BLE (iOS Native) destekler

import { SP630E_CONFIG } from './sp630e-protocol';

let capacitorBLE = null;
let isCapacitor = false;
let connectedDeviceId = null;

// Capacitor ortamında mıyız kontrol et
function checkCapacitor() {
  try {
    isCapacitor = window.Capacitor !== undefined && window.Capacitor.isNativePlatform();
  } catch {
    isCapacitor = false;
  }
  return isCapacitor;
}

// Capacitor BLE plugin'i lazy load
async function getCapacitorBLE() {
  if (capacitorBLE) return capacitorBLE;
  try {
    const { BleClient } = await import('@capacitor-community/bluetooth-le');
    capacitorBLE = BleClient;
    return capacitorBLE;
  } catch (e) {
    console.warn('Capacitor BLE yüklenemedi:', e);
    return null;
  }
}

// Web Bluetooth API mevcut mu?
function hasWebBluetooth() {
  return !!navigator.bluetooth;
}

// Cihaz tarama ve bağlantı
export async function scanAndConnect(onStatusChange) {
  if (checkCapacitor()) {
    return await connectWithCapacitor(onStatusChange);
  } else if (hasWebBluetooth()) {
    return await connectWithWebBluetooth(onStatusChange);
  } else {
    throw new Error('Bu cihazda Bluetooth desteklenmiyor. iOS için Bluefy tarayıcısını kullanın.');
  }
}

// --- Web Bluetooth (Chrome / Bluefy) ---
async function connectWithWebBluetooth(onStatusChange) {
  onStatusChange?.('scanning');

  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: [SP630E_CONFIG.SERVICE_UUID] },
      { namePrefix: 'SP' },
      { namePrefix: 'LED' },
      { namePrefix: 'BLE' }
    ],
    optionalServices: [
      SP630E_CONFIG.SERVICE_UUID,
      SP630E_CONFIG.VENDOR_SERVICE_UUID
    ]
  });

  onStatusChange?.('connecting');

  const gattServer = await device.gatt.connect();
  let service, characteristic;

  try {
    service = await gattServer.getPrimaryService(SP630E_CONFIG.SERVICE_UUID);
    characteristic = await service.getCharacteristic(SP630E_CONFIG.WRITE_CHAR_UUID);
  } catch {
    service = await gattServer.getPrimaryService(SP630E_CONFIG.VENDOR_SERVICE_UUID);
    characteristic = await service.getCharacteristic(SP630E_CONFIG.VENDOR_WRITE_UUID);
  }

  // Bildirim dinle
  try {
    const chars = await service.getCharacteristics();
    for (const char of chars) {
      if (char.properties.notify || char.properties.indicate) {
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (event) => {
          const data = new Uint8Array(event.target.value.buffer);
          console.log('BLE Bildirim:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
        });
      }
    }
  } catch (e) { /* bildirim opsiyonel */ }

  device.addEventListener('gattserverdisconnected', () => {
    onStatusChange?.('disconnected');
  });

  onStatusChange?.('connected');

  return {
    device: { id: device.id, name: device.name || 'SP630E' },
    write: async (data) => {
      await characteristic.writeValueWithoutResponse(data);
    },
    disconnect: () => {
      if (device.gatt.connected) device.gatt.disconnect();
    },
    type: 'web-bluetooth'
  };
}

// --- Capacitor BLE (iOS Native) ---
async function connectWithCapacitor(onStatusChange) {
  const BleClient = await getCapacitorBLE();
  if (!BleClient) throw new Error('BLE plugin yüklenemedi');

  await BleClient.initialize({ androidNeverForLocation: true });

  onStatusChange?.('scanning');

  // iOS'ta requestDevice ile cihaz seç
  const device = await BleClient.requestDevice({
    services: [SP630E_CONFIG.SERVICE_UUID],
    namePrefix: 'SP',
    optionalServices: [SP630E_CONFIG.VENDOR_SERVICE_UUID]
  });

  if (!device) throw new Error('Cihaz seçilmedi');

  onStatusChange?.('connecting');

  await BleClient.connect(device.deviceId, (deviceId) => {
    connectedDeviceId = null;
    onStatusChange?.('disconnected');
  });

  connectedDeviceId = device.deviceId;

  // Bildirim dinle
  try {
    await BleClient.startNotifications(
      device.deviceId,
      SP630E_CONFIG.SERVICE_UUID,
      SP630E_CONFIG.WRITE_CHAR_UUID,
      (value) => {
        const data = new Uint8Array(value.buffer);
        console.log('BLE Bildirim:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
      }
    );
  } catch (e) { /* bildirim opsiyonel */ }

  onStatusChange?.('connected');

  return {
    device: { id: device.deviceId, name: device.name || 'SP630E' },
    write: async (data) => {
      // Capacitor DataView formatına çevir
      await BleClient.writeWithoutResponse(
        device.deviceId,
        SP630E_CONFIG.SERVICE_UUID,
        SP630E_CONFIG.WRITE_CHAR_UUID,
        new DataView(data.buffer)
      );
    },
    disconnect: async () => {
      try {
        await BleClient.disconnect(device.deviceId);
      } catch (e) { /* zaten bağlı değil */ }
      connectedDeviceId = null;
    },
    type: 'capacitor'
  };
}

// Bağlantı türünü kontrol et
export function getConnectionType() {
  if (checkCapacitor()) return 'capacitor';
  if (hasWebBluetooth()) return 'web-bluetooth';
  return 'none';
}

// Platform bilgisi
export function getPlatformInfo() {
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  return {
    isCapacitor: checkCapacitor(),
    hasWebBluetooth: hasWebBluetooth(),
    isIOS: isIOSSafari,
    isAndroid: /Android/.test(navigator.userAgent),
    connectionType: getConnectionType(),
    needsBluefy: isIOSSafari && !hasWebBluetooth() && !checkCapacitor()
  };
}
