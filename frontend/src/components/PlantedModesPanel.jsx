import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Leaf, Sun, Droplets, Waves, Moon, Zap, Eye, Fish, CloudRain, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SP630E_COMMANDS } from '../lib/sp630e-protocol';

// Bitkili akvaryum modları - bilimsel araştırmaya dayalı
// Kaynak: aquascapeguide.com, greenaqua.hu, buceplant.com, 2hraquarist.com
const AQUARIUM_MODES = {
  planted: {
    name: 'Bitkili Akvaryum',
    description: 'Hightech bitkili akvaryumlar için optimize edilmiş modlar',
    icon: Leaf,
    modes: [
      {
        id: 'max_growth',
        name: 'Maksimum Büyüme',
        description: 'CO2 enjeksiyonlu tanklar için. Kırmızı ağırlıklı, fotosentez odaklı. PAR maksimum.',
        icon: Zap,
        color: { r: 100, g: 25, b: 12, ww: 90, cw: 100 },
        // Kırmızı %100, Mavi %12, Beyaz %100 → 6500K benzeri, kırmızı dominant
        science: 'Kırmızı (660nm) + Soğuk Beyaz (6500K). Klorofil A&B emilim pikleri.',
        tags: ['CO2', 'Yüksek Işık', 'Hızlı Büyüme']
      },
      {
        id: 'balanced_growth',
        name: 'Dengeli Büyüme',
        description: 'Orta seviye bitkiler için. Kırmızı-mavi dengeli, doğal görünüm.',
        icon: Leaf,
        color: { r: 80, g: 40, b: 15, ww: 70, cw: 80 },
        science: 'Kırmızı %80, Mavi %15, Yeşil %40. Kompakt ve sağlıklı büyüme.',
        tags: ['Orta Işık', 'Dengeli', 'Az CO2']
      },
      {
        id: 'red_plants',
        name: 'Kırmızı Bitkiler',
        description: 'Rotala, Ludwigia gibi kırmızı bitkilerin rengini artırır.',
        icon: Sparkles,
        color: { r: 100, g: 15, b: 20, ww: 60, cw: 90 },
        science: 'Yüksek kırmızı + yoğun beyaz. Antosiyanin üretimini tetikler.',
        tags: ['Rotala', 'Ludwigia', 'Kırmızı Pigment']
      },
      {
        id: 'carpet_plants',
        name: 'Zemin Bitkileri',
        description: 'Monte Carlo, HC Cuba, Glosso için yüksek PAR ve mavi ağırlıklı.',
        icon: Waves,
        color: { r: 70, g: 30, b: 25, ww: 80, cw: 100 },
        science: 'Yüksek mavi oranı kompakt, yatay büyümeyi teşvik eder.',
        tags: ['HC Cuba', 'Monte Carlo', 'Kompakt']
      },
      {
        id: 'low_tech',
        name: 'Low-Tech Bitkiler',
        description: 'CO2 olmadan, Anubias, Java Fern, Bucephalandra için.',
        icon: Droplets,
        color: { r: 50, g: 35, b: 10, ww: 60, cw: 50 },
        science: 'Düşük yoğunluk, dengeli spektrum. Yosun riski minimum.',
        tags: ['CO2 Yok', 'Düşük Işık', 'Kolay']
      },
      {
        id: 'algae_control',
        name: 'Yosun Kontrol',
        description: 'Yosun sorunu varsa düşük mavi, kısa süre. Geçici mod.',
        icon: CloudRain,
        color: { r: 60, g: 20, b: 5, ww: 50, cw: 30 },
        science: 'Mavi ışık minimumda. Yosun fotosentezini azaltır.',
        tags: ['Yosun', 'Düşük Mavi', 'Geçici']
      },
    ]
  },
  viewing: {
    name: 'Görüntüleme',
    description: 'Akvaryum güzelliğini ön plana çıkaran modlar',
    icon: Eye,
    modes: [
      {
        id: 'natural_daylight',
        name: 'Doğal Gün Işığı',
        description: '6500K doğal beyaz. Gerçekçi renk gösterimi.',
        icon: Sun,
        color: { r: 45, g: 40, b: 30, ww: 50, cw: 100 },
        science: '6500K renk sıcaklığı. CRI >90 benzeri doğal renk.',
        tags: ['6500K', 'Doğal', 'Görsel']
      },
      {
        id: 'vivid_colors',
        name: 'Canlı Renkler',
        description: 'Balık ve bitki renklerini maksimum canlı gösterir.',
        icon: Sparkles,
        color: { r: 80, g: 50, b: 40, ww: 40, cw: 70 },
        science: 'RGB dengeli, yüksek renk doygunluğu. Gösterişli akvaryum.',
        tags: ['Renkli', 'Canlı', 'Gösterişli']
      },
      {
        id: 'warm_ambiance',
        name: 'Sıcak Ambiyans',
        description: '3000K sıcak beyaz. Salon akvaryumu için rahatlatıcı.',
        icon: Sun,
        color: { r: 60, g: 30, b: 5, ww: 100, cw: 20 },
        science: '3000K sıcak beyaz tonları. Rahatlatıcı ortam.',
        tags: ['3000K', 'Sıcak', 'Ambiyans']
      },
      {
        id: 'moonlight_blue',
        name: 'Ay Işığı',
        description: 'Gece görüntüleme. Balıkları strese sokmaz.',
        icon: Moon,
        color: { r: 0, g: 0, b: 15, ww: 0, cw: 5 },
        science: 'Çok düşük mavi. Gece balık davranışı gözlemi.',
        tags: ['Gece', 'Düşük Işık', 'Stressiz']
      },
      {
        id: 'feeding',
        name: 'Besleme Modu',
        description: 'Tam parlaklık, balıkların yemi görmesi için.',
        icon: Fish,
        color: { r: 80, g: 80, b: 60, ww: 100, cw: 100 },
        science: 'Tüm kanallar yüksek. Maksimum görünürlük.',
        tags: ['Besleme', 'Tam Işık', 'Geçici']
      },
    ]
  }
};

const PlantedModesPanel = ({ characteristic, device, setChannels }) => {
  const [activeMode, setActiveMode] = useState(null);
  const [customColor, setCustomColor] = useState(null);
  const [activeCategory, setActiveCategory] = useState('planted');

  const applyMode = useCallback(async (mode) => {
    const color = customColor || mode.color;
    if (setChannels) {
      setChannels({ red: color.r, green: color.g, blue: color.b, warmWhite: color.ww, coolWhite: color.cw });
    }
    if (characteristic) {
      try {
        const result = SP630E_COMMANDS.setRGBWW(color.r, color.g, color.b, color.ww, color.cw);
        for (const cmd of result.commands) { await characteristic.writeValueWithoutResponse(cmd); await new Promise(r => setTimeout(r, 30)); }
      } catch (e) { console.warn('BLE err:', e); }
    }
    setActiveMode(mode.id);
    setCustomColor(null);
    toast.success(`${mode.name} aktif`);
  }, [characteristic, setChannels, customColor]);

  const adjustModeColor = (mode, channel, value) => {
    const base = customColor || { ...mode.color };
    const updated = { ...base, [channel]: value[0] };
    setCustomColor(updated);
    if (setChannels) { setChannels({ red: updated.r, green: updated.g, blue: updated.b, warmWhite: updated.ww, coolWhite: updated.cw }); }
  };

  const getPreviewGradient = (color) => {
    const r = Math.round(color.r * 2.55);
    const g = Math.round(color.g * 2.55);
    const b = Math.round(color.b * 2.55);
    const w = Math.round((color.ww + color.cw) * 1.0);
    return `rgb(${Math.min(255, r + w)}, ${Math.min(255, g + Math.round(w * 0.8))}, ${Math.min(255, b + Math.round(w * 0.5))})`;
  };

  const category = AQUARIUM_MODES[activeCategory];

  return (
    <div className="space-y-5">
      {/* Category Selector */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(AQUARIUM_MODES).map(([key, cat]) => {
          const Icon = cat.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`p-4 rounded-2xl border transition-all text-center ${
                activeCategory === key
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
              }`}
              data-testid={`category-${key}`}
            >
              <Icon className="w-5 h-5 mx-auto mb-2" strokeWidth={1.5} />
              <span className="text-xs font-medium">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Cards - Bento Grid */}
      <div>
        <h3 className="text-xl font-medium mb-1" style={{ fontFamily: 'Outfit' }}>{category.name}</h3>
        <p className="text-xs text-white/30 mb-4">{category.description}</p>

        <div className="grid grid-cols-2 gap-3">
          {category.modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            const displayColor = isActive && customColor ? customColor : mode.color;

            return (
              <div key={mode.id} className={isActive ? 'col-span-2' : ''}>
                <button
                  onClick={() => applyMode(mode)}
                  className={`w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                    isActive ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                  data-testid={`mode-${mode.id}`}
                >
                  {/* Glow effect */}
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-20 blur-xl"
                    style={{ backgroundColor: getPreviewGradient(displayColor) }} />

                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10"
                      style={{ backgroundColor: getPreviewGradient(displayColor) + '30' }}>
                      <Icon className="w-4 h-4 text-white/80" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium truncate">{mode.name}</h4>
                        {isActive && <span className="px-1.5 py-0.5 bg-[#34C759]/20 text-[#34C759] rounded text-[8px] font-semibold">AKTİF</span>}
                      </div>
                      {isActive && <p className="text-[11px] text-white/30 mt-1">{mode.description}</p>}
                    </div>
                  </div>

                  {/* Tags */}
                  {isActive && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {mode.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] text-white/30">{tag}</span>
                      ))}
                    </div>
                  )}
                </button>

                {/* Fine Tuning */}
                {isActive && (
                  <div className="mt-2 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Ayar</span>
                    {[
                      { ch: 'r', l: 'R', c: '#FF3B30' },
                      { ch: 'g', l: 'G', c: '#34C759' },
                      { ch: 'b', l: 'B', c: '#0A84FF' },
                      { ch: 'ww', l: 'WW', c: '#FFD60A' },
                      { ch: 'cw', l: 'CW', c: '#5AC8FA' },
                    ].map(({ ch, l, c }) => (
                      <div key={ch} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                        <Slider value={[displayColor[ch]]} onValueChange={(v) => adjustModeColor(mode, ch, v)}
                          max={100} step={1} trackColor={c} className="flex-1" />
                        <span className="text-xs font-mono w-7 text-right text-white/40">{displayColor[ch]}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-white/20 font-mono mt-2">{mode.science}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlantedModesPanel;
