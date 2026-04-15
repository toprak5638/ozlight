# SP630E LED Kontrol - iOS Native Uygulama Kurulum Rehberi

## Gereksinimler
- macOS bilgisayar
- Xcode 15+ (App Store'dan ücretsiz)
- Apple Developer hesabı (test için ücretsiz hesap yeterli)
- Node.js 18+

## Adım 1: Projeyi İndirin
Emergent platformundan projeyi indirin ve bir klasöre çıkartın.

## Adım 2: Bağımlılıkları Yükleyin
```bash
cd frontend
yarn install
```

## Adım 3: Web Uygulamasını Build Edin
```bash
yarn build
```

## Adım 4: iOS Projesini Oluşturun
```bash
npx cap add ios
npx cap sync ios
```

## Adım 5: Bluetooth İzinlerini Ekleyin
`ios/App/App/Info.plist` dosyasına şu satırları ekleyin:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>SP630E LED kontrolcünüze bağlanmak için Bluetooth gereklidir</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>SP630E LED kontrolcünüze bağlanmak için Bluetooth gereklidir</string>
```

## Adım 6: Xcode'da Açın
```bash
npx cap open ios
```

## Adım 7: Build ve Test
1. Xcode'da sol üstten iPhone cihazınızı veya simulatör seçin
2. ▶ (Play) butonuna basın
3. İlk çalıştırmada Bluetooth izni istenecek - "İzin Ver" deyin
4. "CİHAZ ARA" ile SP630E'ye bağlanın

## Adım 8: TestFlight ile Dağıtım (Opsiyonel)
1. Apple Developer hesabınızla giriş yapın
2. Product > Archive ile .ipa oluşturun
3. App Store Connect'te TestFlight'a yükleyin
4. Diğer iPhone'lara dağıtın

## Sorun Giderme

### "Bluetooth izni verilmedi" hatası
- Ayarlar > Gizlilik > Bluetooth'tan uygulamaya izin verin

### SP630E görünmüyor
- BanlanX uygulamasını tamamen kapatın
- SP630E'nin gücünü kapatıp açın
- Bluetooth'u kapatıp açın

### Bağlantı kopuyor
- SP630E aynı anda sadece 1 BLE bağlantısını destekler
- Diğer cihazlardan SP630E bağlantısını kesin
