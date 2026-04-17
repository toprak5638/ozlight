import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Sunrise, Sunset, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { SP630E_COMMANDS } from '../lib/sp630e-protocol';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Varsayılan gün simülasyonu profili
const DEFAULT_PROFILE = {
  name: 'Akvaryum Gün Döngüsü',
  sunriseTime: '07:00',
  sunsetTime: '21:00',
  transitionMinutes: 60,
  peakIntensity: 100,
  moonlight: true,
  moonIntensity: 5,
  moonColor: { r: 0, g: 0, b: 15, ww: 0, cw: 3 },
  // Gün aşamaları renkleri (yüzde)
  phases: {
    sunrise: { r: 80, g: 30, b: 5, ww: 60, cw: 10 },    // Sıcak turuncu
    morning: { r: 50, g: 40, b: 20, ww: 70, cw: 40 },    // Sıcak doğal
    noon:    { r: 30, g: 35, b: 30, ww: 50, cw: 100 },   // Parlak doğal beyaz
    afternoon: { r: 40, g: 35, b: 25, ww: 60, cw: 60 },  // Doğal
    sunset:  { r: 90, g: 25, b: 5, ww: 40, cw: 5 },      // Kırmızı/turuncu
    night:   { r: 0, g: 0, b: 0, ww: 0, cw: 0 },         // Kapalı
  }
};

const PHASE_LABELS = {
  sunrise: { label: 'Gün Doğumu', icon: Sunrise, color: '#FF9500' },
  morning: { label: 'Sabah', icon: Sun, color: '#FFD60A' },
  noon: { label: 'Öğle', icon: Sun, color: '#E5E5EA' },
  afternoon: { label: 'Öğleden Sonra', icon: Sun, color: '#FFD60A' },
  sunset: { label: 'Gün Batımı', icon: Sunset, color: '#FF3B30' },
  night: { label: 'Gece', icon: Moon, color: '#007AFF' },
};

const AquariumPanel = ({ characteristic, device, setChannels }) => {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('aquarium_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [progress, setProgress] = useState(0);
  const [editingPhase, setEditingPhase] = useState(null);
  const intervalRef = useRef(null);

  // Profili kaydet
  useEffect(() => {
    localStorage.setItem('aquarium_profile', JSON.stringify(profile));
  }, [profile]);

  // Temizle
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Saat → dakika
  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Şuanki rengi hesapla (iki faz arası interpolasyon)
  const calculateCurrentColor = useCallback(() => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const sunrise = timeToMinutes(profile.sunriseTime);
    const sunset = timeToMinutes(profile.sunsetTime);
    const trans = profile.transitionMinutes;
    const dayLength = sunset - sunrise;
    const peak = profile.peakIntensity / 100;

    let phase = 'night';
    let color = { r: 0, g: 0, b: 0, ww: 0, cw: 0 };
    let t = 0; // geçiş oranı (0-1)

    if (currentMin < sunrise - trans / 2) {
      // Gece (gün doğumundan önce)
      phase = 'night';
      if (profile.moonlight) {
        color = { ...profile.moonColor };
      }
    } else if (currentMin < sunrise) {
      // Gün doğumu geçişi (gece → gün doğumu)
      phase = 'sunrise';
      t = (currentMin - (sunrise - trans / 2)) / (trans / 2);
      const from = profile.moonlight ? profile.moonColor : profile.phases.night;
      const to = profile.phases.sunrise;
      color = lerpColor(from, to, t);
    } else if (currentMin < sunrise + trans) {
      // Gün doğumu → Sabah geçişi
      phase = 'morning';
      t = (currentMin - sunrise) / trans;
      color = lerpColor(profile.phases.sunrise, profile.phases.morning, t);
    } else if (currentMin < sunrise + dayLength * 0.3) {
      // Sabah → Öğle
      phase = 'morning';
      t = (currentMin - sunrise - trans) / (dayLength * 0.3 - trans);
      color = lerpColor(profile.phases.morning, profile.phases.noon, Math.min(1, t));
    } else if (currentMin < sunset - dayLength * 0.3) {
      // Öğle (pik)
      phase = 'noon';
      color = { ...profile.phases.noon };
    } else if (currentMin < sunset - trans) {
      // Öğleden sonra
      phase = 'afternoon';
      t = (currentMin - (sunset - dayLength * 0.3)) / (dayLength * 0.3 - trans);
      color = lerpColor(profile.phases.noon, profile.phases.afternoon, Math.min(1, t));
    } else if (currentMin < sunset) {
      // Gün batımı geçişi
      phase = 'sunset';
      t = (currentMin - (sunset - trans)) / trans;
      color = lerpColor(profile.phases.afternoon, profile.phases.sunset, t);
    } else if (currentMin < sunset + trans / 2) {
      // Gün batımı → Gece
      phase = 'sunset';
      t = (currentMin - sunset) / (trans / 2);
      const to = profile.moonlight ? profile.moonColor : profile.phases.night;
      color = lerpColor(profile.phases.sunset, to, t);
    } else {
      // Gece
      phase = 'night';
      if (profile.moonlight) {
        color = { ...profile.moonColor };
      }
    }

    // Peak intensity uygula
    color = {
      r: Math.round(color.r * peak),
      g: Math.round(color.g * peak),
      b: Math.round(color.b * peak),
      ww: Math.round(color.ww * peak),
      cw: Math.round(color.cw * peak),
    };

    // Gün ilerleme yüzdesi
    let dayProgress = 0;
    if (currentMin >= sunrise && currentMin <= sunset) {
      dayProgress = ((currentMin - sunrise) / (sunset - sunrise)) * 100;
    } else if (currentMin > sunset) {
      dayProgress = 100;
    }

    return { color, phase, dayProgress };
  }, [profile]);

  // Renk interpolasyonu
  const lerpColor = (from, to, t) => {
    t = Math.max(0, Math.min(1, t));
    return {
      r: Math.round(from.r + (to.r - from.r) * t),
      g: Math.round(from.g + (to.g - from.g) * t),
      b: Math.round(from.b + (to.b - from.b) * t),
      ww: Math.round(from.ww + (to.ww - from.ww) * t),
      cw: Math.round(from.cw + (to.cw - from.cw) * t),
    };
  };

  // BLE komut gönder
  const sendColor = useCallback(async (color) => {
    if (setChannels) {
      setChannels({
        red: color.r, green: color.g, blue: color.b,
        warmWhite: color.ww, coolWhite: color.cw
      });
    }

    if (characteristic) {
      try {
        const result = SP630E_COMMANDS.setRGBWW(color.r, color.g, color.b, color.ww, color.cw);
        for (const cmd of result.commands) {
          await characteristic.writeValueWithoutResponse(cmd);
          await new Promise(r => setTimeout(r, 30));
        }
      } catch (e) {
        console.warn('BLE hatası:', e);
      }
    }
  }, [characteristic, setChannels]);

  // Simülasyonu başlat
  const startSimulation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsRunning(true);
    toast.success('Gün simülasyonu başlatıldı!');

    // Her 30 saniyede güncelle
    const update = () => {
      const { color, phase, dayProgress } = calculateCurrentColor();
      setCurrentPhase(phase);
      setProgress(dayProgress);
      sendColor(color);
    };

    update(); // Hemen başla
    intervalRef.current = setInterval(update, 30000); // 30 saniye
  };

  // Durdur
  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    toast.info('Gün simülasyonu durduruldu');
  };

  // Profili sıfırla
  const resetProfile = () => {
    setProfile(DEFAULT_PROFILE);
    toast.success('Profil varsayılana sıfırlandı');
  };

  // Backend'e profil kaydet
  const saveProfileToBackend = async () => {
    try {
      await axios.post(`${API}/presets`, {
        name: `Akvaryum: ${profile.name}`,
        color: {
          red: profile.phases.noon.r,
          green: profile.phases.noon.g,
          blue: profile.phases.noon.b,
          warm_white: profile.phases.noon.ww,
          cool_white: profile.phases.noon.cw
        },
        is_favorite: true
      });
      toast.success('Profil kaydedildi!');
    } catch (e) {
      console.warn('Kayıt hatası:', e);
    }
  };

  const updatePhaseColor = (phaseName, channel, value) => {
    setProfile(prev => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phaseName]: { ...prev.phases[phaseName], [channel]: value[0] }
      }
    }));
  };

  const getPhasePreview = (phase) => {
    const c = phase;
    const r = Math.round(c.r * 2.55);
    const g = Math.round(c.g * 2.55);
    const b = Math.round(c.b * 2.55);
    const w = Math.round((c.ww + c.cw) * 1.2);
    return `rgb(${Math.min(255, r + w)}, ${Math.min(255, g + w)}, ${Math.min(255, b + w)})`;
  };

  return (
    <div className="space-y-6">
      {/* Durum Göstergesi */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            GÜN SİMÜLASYONU
          </h3>
          {isRunning && (
            <span className="px-3 py-1 bg-[#00C781]/20 text-[#00C781] rounded-full text-xs font-bold animate-pulse">
              AKTİF
            </span>
          )}
        </div>

        {/* Gün ilerleme çubuğu */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#A1A1AA] mb-2">
            <span>{profile.sunriseTime}</span>
            <span className="font-bold text-white">
              {currentPhase ? PHASE_LABELS[currentPhase]?.label : 'Bekliyor'}
            </span>
            <span>{profile.sunsetTime}</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(to right, #FF9500, #FFD60A, #E5E5EA, #FFD60A, #FF3B30)'
              }}
            />
          </div>
        </div>

        {/* Faz ikonları */}
        <div className="flex justify-between px-2">
          {Object.entries(PHASE_LABELS).map(([key, { label, icon: Icon, color }]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  currentPhase === key ? 'border-white scale-110' : 'border-white/10'
                }`}
                style={{ backgroundColor: currentPhase === key ? color + '30' : 'transparent' }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-[9px] text-[#52525B]">{label}</span>
            </div>
          ))}
        </div>

        {/* Kontrol Butonları */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {!isRunning ? (
            <Button
              onClick={startSimulation}
              className="h-12 bg-[#00C781] hover:bg-[#00A86B] text-white rounded-lg font-bold uppercase tracking-wider col-span-2"
              data-testid="start-simulation-button"
            >
              <Play className="w-5 h-5 mr-2" />
              BAŞLAT
            </Button>
          ) : (
            <Button
              onClick={stopSimulation}
              className="h-12 bg-[#FF3B30] hover:bg-[#CC2E26] text-white rounded-lg font-bold uppercase tracking-wider col-span-2"
              data-testid="stop-simulation-button"
            >
              <Pause className="w-5 h-5 mr-2" />
              DURDUR
            </Button>
          )}
        </div>
      </div>

      {/* Zaman Ayarları */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-medium mb-4" style={{ fontFamily: 'Outfit' }}>
          ZAMAN AYARLARI
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF9500] block mb-2">
              <Sunrise className="w-3 h-3 inline mr-1" />Gün Doğumu
            </label>
            <Input
              type="time"
              value={profile.sunriseTime}
              onChange={(e) => setProfile(p => ({ ...p, sunriseTime: e.target.value }))}
              className="bg-[#0A0A0A] border-white/10"
              data-testid="sunrise-time-input"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF3B30] block mb-2">
              <Sunset className="w-3 h-3 inline mr-1" />Gün Batımı
            </label>
            <Input
              type="time"
              value={profile.sunsetTime}
              onChange={(e) => setProfile(p => ({ ...p, sunsetTime: e.target.value }))}
              className="bg-[#0A0A0A] border-white/10"
              data-testid="sunset-time-input"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Geçiş Süresi</label>
            <span className="text-lg font-mono text-white" data-testid="transition-value">{profile.transitionMinutes} dk</span>
          </div>
          <Slider
            value={[profile.transitionMinutes]}
            onValueChange={(v) => setProfile(p => ({ ...p, transitionMinutes: v[0] }))}
            min={15} max={120} step={5}
            trackColor="#007AFF"
            data-testid="transition-slider"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Pik Parlaklık</label>
            <span className="text-lg font-mono text-white" data-testid="peak-value">{profile.peakIntensity}%</span>
          </div>
          <Slider
            value={[profile.peakIntensity]}
            onValueChange={(v) => setProfile(p => ({ ...p, peakIntensity: v[0] }))}
            min={10} max={100} step={5}
            trackColor="#FFD60A"
            data-testid="peak-slider"
          />
        </div>
      </div>

      {/* Ay Işığı */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            <Moon className="w-5 h-5 inline mr-2 text-[#007AFF]" />
            AY IŞIĞI
          </h3>
          <Switch
            checked={profile.moonlight}
            onCheckedChange={(v) => setProfile(p => ({ ...p, moonlight: v }))}
            data-testid="moonlight-toggle"
          />
        </div>

        {profile.moonlight && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#007AFF]">Mavi</label>
                <span className="text-lg font-mono text-[#007AFF]">{profile.moonColor.b}%</span>
              </div>
              <Slider
                value={[profile.moonColor.b]}
                onValueChange={(v) => setProfile(p => ({ ...p, moonColor: { ...p.moonColor, b: v[0] } }))}
                min={0} max={30} step={1}
                trackColor="#007AFF"
                data-testid="moon-blue-slider"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5E5EA]">Soğuk Beyaz</label>
                <span className="text-lg font-mono text-[#E5E5EA]">{profile.moonColor.cw}%</span>
              </div>
              <Slider
                value={[profile.moonColor.cw]}
                onValueChange={(v) => setProfile(p => ({ ...p, moonColor: { ...p.moonColor, cw: v[0] } }))}
                min={0} max={20} step={1}
                trackColor="#E5E5EA"
                data-testid="moon-cw-slider"
              />
            </div>
            <div
              className="h-12 rounded-lg border border-white/10 flex items-center justify-center text-xs font-mono"
              style={{ backgroundColor: getPhasePreview(profile.moonColor) }}
              data-testid="moon-preview"
            >
              <span className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Ay Işığı Önizleme</span>
            </div>
          </div>
        )}
      </div>

      {/* Faz Renk Düzenleme */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-medium mb-4" style={{ fontFamily: 'Outfit' }}>
          FAZ RENKLERİ
        </h3>
        <div className="space-y-3">
          {Object.entries(PHASE_LABELS).filter(([k]) => k !== 'night').map(([key, { label, color }]) => (
            <div key={key}>
              <button
                onClick={() => setEditingPhase(editingPhase === key ? null : key)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                data-testid={`phase-edit-${key}`}
              >
                <div
                  className="w-10 h-10 rounded-lg border border-white/10 flex-shrink-0"
                  style={{ backgroundColor: getPhasePreview(profile.phases[key]) }}
                />
                <div className="flex-1 text-left">
                  <span className="font-bold text-sm" style={{ color }}>{label}</span>
                  <p className="text-[10px] font-mono text-[#52525B]">
                    R:{profile.phases[key].r} G:{profile.phases[key].g} B:{profile.phases[key].b} WW:{profile.phases[key].ww} CW:{profile.phases[key].cw}
                  </p>
                </div>
                <span className="text-[#52525B] text-xs">{editingPhase === key ? '▲' : '▼'}</span>
              </button>

              {editingPhase === key && (
                <div className="mt-2 p-4 bg-white/5 rounded-lg space-y-3">
                  {[
                    { ch: 'r', label: 'K', color: '#FF3B30' },
                    { ch: 'g', label: 'Y', color: '#34C759' },
                    { ch: 'b', label: 'M', color: '#007AFF' },
                    { ch: 'ww', label: 'SB', color: '#FFD60A' },
                    { ch: 'cw', label: 'SoB', color: '#E5E5EA' },
                  ].map(({ ch, label: chLabel, color: chColor }) => (
                    <div key={ch} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-6" style={{ color: chColor }}>{chLabel}</span>
                      <Slider
                        value={[profile.phases[key][ch]]}
                        onValueChange={(v) => updatePhaseColor(key, ch, v)}
                        max={100} step={1}
                        trackColor={chColor}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-8 text-right" style={{ color: chColor }}>
                        {profile.phases[key][ch]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alt Butonlar */}
      <div className="flex gap-3">
        <Button
          onClick={saveProfileToBackend}
          className="flex-1 h-10 bg-[#007AFF] hover:bg-[#0066CC] text-white text-xs font-bold uppercase"
          data-testid="save-profile-button"
        >
          Profili Kaydet
        </Button>
        <Button
          onClick={resetProfile}
          variant="outline"
          className="h-10 border-white/10 text-xs font-bold uppercase"
          data-testid="reset-profile-button"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AquariumPanel;
