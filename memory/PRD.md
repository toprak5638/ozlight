# SP630E RGBWW LED Controller - PRD

## Problem Statement
SP630E 5 kanallı RGBWW LED kontrol cihazı için gelişmiş web uygulaması. Mevcut BanlanX uygulaması renkleri sadece çark üzerinden ayarlıyor. Kullanıcı her kanalı (R, G, B, Sıcak Beyaz, Soğuk Beyaz) ayrı ayrı yüzdesel olarak kontrol edebilmek istiyor.

## Architecture
- **Backend:** FastAPI + MongoDB (presets, schedules, devices, commands)
- **Frontend:** React + Tailwind + Shadcn/UI (mobil uyumlu, dark theme)
- **Bluetooth:** Web Bluetooth API (Chrome/Edge)

## User Personas
- LED hobi kullanıcıları
- Akıllı ev meraklıları
- RGBWW LED şerit/panel sahipleri

## Core Requirements
1. 5 kanal bağımsız slider kontrolü (R, G, B, W1, W2) %0-100
2. Bluetooth cihaz tarama/bağlantı
3. Renk preset sistemi (kaydet/yükle/sil/favori)
4. Zamanlayıcı/otomasyon
5. Animasyon efektleri (fade, pulse, rainbow, strobe)
6. Gerçek zamanlı renk önizleme

## What's Been Implemented (April 15, 2026)
- [x] Backend API: 10+ endpoint (devices, presets, schedules, commands)
- [x] Frontend: 6 React bileşen (Connection, Control, Presets, Schedule, Animation, Settings)
- [x] 5 kanal renkli slider kontrolü 
- [x] Renk önizleme paneli (glow efekti)
- [x] Preset sistemi (MongoDB)
- [x] Zamanlayıcı sistemi
- [x] 4 animasyon modu
- [x] Demo modu (Bluetooth olmadan test)
- [x] Mobil uyumlu dark theme UI
- [x] %100 test geçişi (backend + frontend)

### Phase 2: Gerçek SP630E Protokol Entegrasyonu (April 15, 2026)
- [x] Gerçek BLE UUID'ler entegre edildi (Service: 0000ffe0, Write: 0000ffe1)
- [x] SP630E komut formatı: 0x53 [CMD] 0x00 0x01 0x00 [LEN] [DATA]
- [x] RGBWW komut seti: Power, Brightness, RGB Color, CCT, Mode/Effect, Speed
- [x] 12 PWM dinamik efekt (7 renk atlama, nefes, stroboskop, gradyan, tekli nefesler)
- [x] Coexistence modu (RGB + White aynı anda kontrol)
- [x] Eski protokol desteği (A0 xx xx xx formatı) alternatif olarak
- [x] Efekt hız kontrolü slider (1-10)
- [x] Bildirim dinleme altyapısı
- [x] Ayarlar panelinde BLE protokol UUID ve komut formatı gösterimi
- [x] %100 test geçişi (backend + frontend, iteration 2)

### Phase 3: PWA + iOS Bluefy Desteği (April 15, 2026)
- [x] PWA manifest.json eklendi (standalone, portrait, dark theme)
- [x] Service Worker eklendi (cache stratejisi, offline destek)
- [x] iOS meta etiketleri (apple-mobile-web-app-capable, status-bar-style)
- [x] iOS Bluefy tarayıcı rehberi (App Store linki ile)
- [x] Ana ekrana ekleme rehberi (iOS/Android/Desktop)
- [x] Tüm bileşenlerde SP630E gerçek protokol kullanımı (setRGBWW komutu)
- [x] %100 test geçişi (backend + frontend + PWA, iteration 3)

## Prioritized Backlog
### P0 (Critical)
- SP630E gerçek Bluetooth UUID'lerini keşfetme (reverse engineering)

### P1 (Important)
- Zamanlayıcı ile otomatik LED kontrol (cron job)
- Preset paylaşma özelliği
- Animasyon özelleştirme (hız, renk, süre)

### P2 (Nice to have)
- PWA desteği (offline çalışma)
- Müzikle senkronizasyon
- Birden fazla cihaz yönetimi
- Renk sıcaklığı (CCT) modu

## Next Tasks
1. Gerçek SP630E ile Bluetooth UUID keşfi
2. PWA manifest ve service worker ekleme
3. Animasyon hız/renk özelleştirme
4. Çoklu cihaz desteği
