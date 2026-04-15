// SP630E RGBWW LED Controller - Gerçek BLE Protokolü
// Kaynak: UniLED (monty68/uniled) ve phhusson/ha-banlanx reverse engineering

export const SP630E_CONFIG = {
  // BLE Service & Characteristic UUIDs
  SERVICE_UUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
  WRITE_CHAR_UUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  
  // Vendor specific (alternatif)
  VENDOR_SERVICE_UUID: '5833ff01-9b8b-5191-6142-22a4536ef123',
  VENDOR_WRITE_UUID: '5833ff02-9b8b-5191-6142-22a4536ef123',
  VENDOR_NOTIFY_UUID: '5833ff03-9b8b-5191-6142-22a4536ef123',
  
  // Manufacturer ID
  MANUFACTURER_ID: 20563,
  
  // SP630E Device ID
  DEVICE_ID: 0x1F,

  // Light Types
  LIGHT_TYPES: {
    0x81: '1 CH PWM - Tek Renk',
    0x83: '2 CH PWM - CCT',
    0x85: '3 CH PWM - RGB',
    0x87: '4 CH PWM - RGBW',
    0x8A: '5 CH PWM - RGBCCT',
    0x82: 'SPI - Tek Renk',
    0x86: 'SPI - RGB',
    0x88: 'SPI - RGBW',
    0x8B: 'SPI - RGBCCT',
  },

  // Modes
  MODES: {
    STATIC_COLOR: 0x01,
    STATIC_WHITE: 0x02,
    DYNAMIC_COLOR: 0x03,
    DYNAMIC_WHITE: 0x04,
    SOUND_COLOR: 0x05,
    SOUND_WHITE: 0x06,
    CUSTOM_COLOR: 0x07,
  },

  // Commands
  COMMANDS: {
    STATE_QUERY: 0x02,
    ONOFF_EFFECT: 0x08,
    COEXISTENCE: 0x0A,
    ON_POWER: 0x0B,
    POWER: 0x50,
    BRIGHTNESS: 0x51,
    RGB_COLOR_STATIC: 0x52,
    MODE_EFFECT: 0x53,
    EFFECT_SPEED: 0x54,
    EFFECT_LENGTH: 0x55,
    EFFECT_DIRECTION: 0x56,
    RGB_COLOR_DYNAMIC: 0x57,
    EFFECT_LOOP: 0x58,
    AUDIO_INPUT: 0x59,
    SENSITIVITY: 0x5A,
    PLAY_PAUSE: 0x5D,
    CCT_DYNAMIC: 0x60,
    CCT_STATIC: 0x61,
    LIGHT_TYPE: 0x6A,
    CHIP_ORDER: 0x6B,
  }
};

// SP630E protokolünde mesaj encoder
export function encodeCommand(cmd, data) {
  const HEADER_BYTE = 0x53;
  const key = 0x00;
  const dataLen = data.length & 0xFF;
  
  const encoded = new Uint8Array(6 + dataLen);
  encoded[0] = HEADER_BYTE;
  encoded[1] = cmd & 0xFF;
  encoded[2] = key;
  encoded[3] = 0x01;
  encoded[4] = 0x00;
  encoded[5] = dataLen;
  
  for (let i = 0; i < dataLen; i++) {
    encoded[6 + i] = data[i];
  }
  
  return encoded;
}

// Eski protokol (basit komutlar - phhusson/ha-banlanx)
export function encodeLegacyCommand(bytes) {
  return new Uint8Array(bytes);
}

// Komut oluşturucular
export const SP630E_COMMANDS = {
  // Güç Aç/Kapat
  powerOn: () => encodeCommand(SP630E_CONFIG.COMMANDS.POWER, [0x01]),
  powerOff: () => encodeCommand(SP630E_CONFIG.COMMANDS.POWER, [0x00]),
  
  // Durum Sorgusu
  queryState: () => encodeCommand(SP630E_CONFIG.COMMANDS.STATE_QUERY, [0x01]),
  
  // Parlaklık (0-255)
  // which: 0x00 = color brightness, 0x01 = white brightness
  setColorBrightness: (level) => encodeCommand(SP630E_CONFIG.COMMANDS.BRIGHTNESS, [0x00, level & 0xFF]),
  setWhiteBrightness: (level) => encodeCommand(SP630E_CONFIG.COMMANDS.BRIGHTNESS, [0x01, level & 0xFF]),
  
  // RGB Renk Ayarı (statik mod)
  setRGBColor: (r, g, b, level = 0xFF) => encodeCommand(SP630E_CONFIG.COMMANDS.RGB_COLOR_STATIC, [r & 0xFF, g & 0xFF, b & 0xFF, level & 0xFF]),
  
  // RGB Renk Ayarı (dinamik mod)
  setRGBColorDynamic: (r, g, b) => encodeCommand(SP630E_CONFIG.COMMANDS.RGB_COLOR_DYNAMIC, [r & 0xFF, g & 0xFF, b & 0xFF]),
  
  // CCT (Soğuk/Sıcak Beyaz) Ayarı (statik mod)
  setCCTStatic: (cold, warm) => encodeCommand(SP630E_CONFIG.COMMANDS.CCT_STATIC, [cold & 0xFF, warm & 0xFF]),
  
  // CCT (Soğuk/Sıcak Beyaz) Ayarı (dinamik mod)
  setCCTDynamic: (cold, warm) => encodeCommand(SP630E_CONFIG.COMMANDS.CCT_DYNAMIC, [cold & 0xFF, warm & 0xFF]),
  
  // Mod ve Efekt Ayarı
  setModeEffect: (mode, effect) => encodeCommand(SP630E_CONFIG.COMMANDS.MODE_EFFECT, [mode & 0xFF, effect & 0xFF]),
  
  // Efekt Hızı (1-10)
  setEffectSpeed: (speed) => encodeCommand(SP630E_CONFIG.COMMANDS.EFFECT_SPEED, [speed & 0xFF]),
  
  // Efekt Uzunluğu (1-150)
  setEffectLength: (length) => encodeCommand(SP630E_CONFIG.COMMANDS.EFFECT_LENGTH, [length & 0xFF]),
  
  // Efekt Yönü
  setEffectDirection: (forward) => encodeCommand(SP630E_CONFIG.COMMANDS.EFFECT_DIRECTION, [forward ? 0x01 : 0x00]),
  
  // Efekt Döngü
  setEffectLoop: (enabled) => encodeCommand(SP630E_CONFIG.COMMANDS.EFFECT_LOOP, [enabled ? 0x01 : 0x00]),
  
  // Ses Girişi (0=Dahili Mikrofon, 1=Telefon, 2=Harici Mikrofon)
  setAudioInput: (input) => encodeCommand(SP630E_CONFIG.COMMANDS.AUDIO_INPUT, [input & 0xFF]),
  
  // Ses Hassasiyeti (1-16)
  setSensitivity: (gain) => encodeCommand(SP630E_CONFIG.COMMANDS.SENSITIVITY, [gain & 0xFF]),
  
  // Oynat/Duraklat
  playPause: (play) => encodeCommand(SP630E_CONFIG.COMMANDS.PLAY_PAUSE, [play ? 0x01 : 0x00]),
  
  // Coexistence (RGB + White aynı anda)
  setCoexistence: (enabled) => encodeCommand(SP630E_CONFIG.COMMANDS.COEXISTENCE, [enabled ? 0x01 : 0x00]),
  
  // LED Tipi Ayarı
  setLightType: (type) => encodeCommand(SP630E_CONFIG.COMMANDS.LIGHT_TYPE, [0x01, type & 0x7F]),
  
  // Chip Sırası
  setChipOrder: (order) => encodeCommand(SP630E_CONFIG.COMMANDS.CHIP_ORDER, [order & 0xFF]),

  // RGBWW tam kontrol (5 kanal) - Yüzde değerleri (0-100) alıp 0-255'e çevirir
  setRGBWW: (red, green, blue, warmWhite, coolWhite, colorBrightness = 100) => {
    const r = Math.round((red / 100) * 255);
    const g = Math.round((green / 100) * 255);
    const b = Math.round((blue / 100) * 255);
    const ww = Math.round((warmWhite / 100) * 255);
    const cw = Math.round((coolWhite / 100) * 255);
    const level = Math.round((colorBrightness / 100) * 255);
    
    return {
      commands: [
        // Coexistence açık (RGB + White aynı anda)
        encodeCommand(SP630E_CONFIG.COMMANDS.COEXISTENCE, [0x01]),
        // Statik renk modu, solid efekt
        encodeCommand(SP630E_CONFIG.COMMANDS.MODE_EFFECT, [SP630E_CONFIG.MODES.STATIC_COLOR, 0x01]),
        // RGB renk ayarla
        encodeCommand(SP630E_CONFIG.COMMANDS.RGB_COLOR_STATIC, [r, g, b, level]),
        // CCT (soğuk/sıcak beyaz) ayarla
        encodeCommand(SP630E_CONFIG.COMMANDS.CCT_STATIC, [cw, ww]),
        // Beyaz parlaklık ayarla
        encodeCommand(SP630E_CONFIG.COMMANDS.BRIGHTNESS, [0x01, Math.max(ww, cw)]),
      ],
      description: `R:${red}% G:${green}% B:${blue}% WW:${warmWhite}% CW:${coolWhite}%`
    };
  },
};

// Eski protokol komutları (daha basit, bazı cihazlarda çalışır)
export const LEGACY_COMMANDS = {
  powerOn: () => encodeLegacyCommand([0xA0, 0x62, 0x01, 0x01]),
  powerOff: () => encodeLegacyCommand([0xA0, 0x62, 0x01, 0x00]),
  setBrightness: (level) => encodeLegacyCommand([0xA0, 0x66, 0x01, level & 0xFF]),
  setEffectType: (type) => encodeLegacyCommand([0xA0, 0x63, 0x01, type & 0xFF]),
  setRGBMode: () => encodeLegacyCommand([0xA0, 0x63, 0x01, 0xBE]),
  setColor: (r, g, b, brightness) => encodeLegacyCommand([0xA0, 0x69, 0x04, r & 0xFF, g & 0xFF, b & 0xFF, brightness & 0xFF]),
  setSpeed: (speed) => encodeLegacyCommand([0xA0, 0x67, 0x01, speed & 0xFF]),
  setLength: (length) => encodeLegacyCommand([0xA0, 0x68, 0x01, length & 0xFF]),
};

// Dinamik efektler listesi
export const DYNAMIC_EFFECTS = {
  // SPI Efektler
  0x01: { name: 'Gökkuşağı', type: 'spi' },
  0x02: { name: 'Gökkuşağı Meteor', type: 'spi' },
  0x03: { name: 'Gökkuşağı Kuyruklu Yıldız', type: 'spi' },
  0x04: { name: 'Gökkuşağı Segment', type: 'spi' },
  0x05: { name: 'Gökkuşağı Dalga', type: 'spi' },
  0x06: { name: 'Gökkuşağı Atlama', type: 'spi' },
  0x07: { name: 'Gökkuşağı Yıldızlar', type: 'spi' },
  0x08: { name: 'Gökkuşağı Döndürme', type: 'spi' },
  0x09: { name: 'Ateş (Kırmızı-Sarı)', type: 'spi' },
  0x0F: { name: 'Kuyruklu Yıldız (Kırmızı)', type: 'spi' },
  0x32: { name: 'Dalga (Kırmızı)', type: 'spi' },
  0x4E: { name: 'Yıldızlar (Kırmızı)', type: 'spi' },
  0x62: { name: 'Nefes (Kırmızı)', type: 'spi' },
  // PWM Efektler
  0x01: { name: '7 Renk Atlama', type: 'pwm' },
  0x02: { name: '7 Renk Nefes', type: 'pwm' },
  0x03: { name: '7 Renk Stroboskop', type: 'pwm' },
  0x04: { name: '7 Renk Nabız', type: 'pwm' },
  0x05: { name: '7 Renk Gradyan', type: 'pwm' },
  0x06: { name: 'Kırmızı Nefes', type: 'pwm' },
  0x07: { name: 'Yeşil Nefes', type: 'pwm' },
  0x08: { name: 'Mavi Nefes', type: 'pwm' },
};

// Bildirim verisi parse etme
export function parseNotification(data) {
  if (data.length < 6 || data[0] !== 0x53) return null;
  
  const messageType = data[1];
  if (messageType !== 0x02) return null; // Sadece durum mesajlarını parse et
  
  try {
    return {
      firmware: String.fromCharCode(...data.slice(11, 18)),
      power: data[29] > 0x00,
      mode: data[32],
      effect: data[33],
      colorLevel: data[35],
      whiteLevel: data[36],
      rgb: { r: data[37], g: data[38], b: data[39] },
      cct: { cold: data[40], warm: data[41] },
      speed: data[42],
      length: data[43],
      direction: data[44],
      gain: data[45],
      audioInput: data[46],
      lightType: data[19],
    };
  } catch (e) {
    console.error('Bildirim parse hatası:', e);
    return null;
  }
}
