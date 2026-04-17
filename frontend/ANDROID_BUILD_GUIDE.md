# OzLight - Android APK Build Rehberi

## Gereksinimler
- Android Studio (zaten yüklü)
- Android SDK 34+

## Adım 1: Projeyi İndirin
Emergent platformundan projeyi indirin ve bir klasöre çıkartın.

## Adım 2: Android Studio'da Açın
```
Android Studio > Open > frontend/android klasörünü seçin
```

## Adım 3: Gradle Sync
Android Studio otomatik olarak Gradle sync yapacak. İlk seferde biraz sürebilir.

## Adım 4: BLE İzinleri (Zaten Ekli)
AndroidManifest.xml'de Bluetooth izinleri önceden eklenmiş:
- BLUETOOTH_SCAN
- BLUETOOTH_CONNECT
- ACCESS_FINE_LOCATION (Android 11 ve altı için)

## Adım 5: Debug APK Oluşturma
1. Android Studio'da: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Ya da Terminal'den:
```bash
cd frontend/android
./gradlew assembleDebug
```
3. APK burada: `android/app/build/outputs/apk/debug/app-debug.apk`

## Adım 6: Android Telefona Yükleme
### USB ile:
1. Telefonunuzda: Ayarlar > Geliştirici Seçenekleri > USB Hata Ayıklama AÇIK
2. USB kabloyla bağlayın
3. Android Studio'da ▶ (Run) butonuna basın

### APK ile:
1. APK dosyasını telefona gönderin (e-posta, Telegram, USB)
2. Dosya yöneticisinden APK'ya dokunun
3. "Bilinmeyen kaynaklar" izni verin
4. Yükleyin

## Adım 7: İlk Kullanım
1. Uygulamayı açın
2. Bluetooth izni istenecek → **İzin Ver**
3. Konum izni istenecek (Android 11 altı) → **İzin Ver**
4. "Cihaz Ara" butonuna basın
5. SP630E cihazınızı seçin
6. LED'lerinizi kontrol edin!

## Release APK (Dağıtım için)
```bash
cd frontend/android
./gradlew assembleRelease
```
İmzalama için `android/app/build.gradle`'a signing config ekleyin:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("ozlight.keystore")
            storePassword "your-password"
            keyAlias "ozlight"
            keyPassword "your-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

Keystore oluşturma:
```bash
keytool -genkey -v -keystore ozlight.keystore -alias ozlight -keyalg RSA -keysize 2048 -validity 10000
```

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Bluetooth cihaz görünmüyor | BanlanX kapatın, SP630E gücünü yeniden açın |
| İzin hatası | Ayarlar > Uygulamalar > OzLight > İzinler'den Bluetooth/Konum açın |
| Gradle hatası | Android Studio > File > Invalidate Caches / Restart |
| SDK bulunamadı | SDK Manager'dan Android 34 ve Build Tools 34.0 yükleyin |
