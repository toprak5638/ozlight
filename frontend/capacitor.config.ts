import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sp630e.ledcontroller',
  appName: 'SP630E LED Kontrol',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'SP630E aranıyor...',
        cancel: 'İptal',
        availableDevices: 'Mevcut Cihazlar',
        noDeviceFound: 'Cihaz bulunamadı'
      }
    }
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0A0A0A',
    preferredContentMode: 'mobile'
  }
};

export default config;
