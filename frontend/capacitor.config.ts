import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ozlight.app',
  appName: 'OzLight',
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
  android: {
    backgroundColor: '#05050A',
    allowMixedContent: true
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#05050A',
    preferredContentMode: 'mobile'
  }
};

export default config;
