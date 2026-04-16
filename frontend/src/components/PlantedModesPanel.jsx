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

    setActiveMode(mode.id);
    setCustomColor(null);
    toast.success(`${mode.name} modu aktif!`);
  }, [characteristic, setChannels, customColor]);

  const adjustModeColor = (mode, channel, value) => {
    const base = customColor || { ...mode.color };
    const updated = { ...base, [channel]: value[0] };
    setCustomColor(updated);
    
    // Anlık gönder
    if (setChannels) {
      setChannels({
        red: updated.r, green: updated.g, blue: updated.b,
        warmWhite: updated.ww, coolWhite: updated.cw
      });
    }
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
    <div className="space-y-6">
      {/* Kategori Seçimi */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(AQUARIUM_MODES).map(([key, cat]) => {
          const Icon = cat.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`p-4 rounded-lg border font-bold text-sm transition-all ${
                activeCategory === key
                  ? 'bg-[#00C781]/20 border-[#00C781] text-[#00C781]'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
              data-testid={`category-${key}`}
            >
              <Icon className="w-5 h-5 mx-auto mb-2" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Mod Listesi */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          {category.name.toUpperCase()}
        </h3>
        <p className="text-xs text-[#A1A1AA] mb-4">{category.description}</p>

        <div className="space-y-3">
          {category.modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            const displayColor = isActive && customColor ? customColor : mode.color;

            return (
              <div key={mode.id} className="space-y-0">
                <button
                  onClick={() => applyMode(mode)}
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    isActive
                      ? 'bg-white/10 border-[#00C781]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  data-testid={`mode-${mode.id}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Renk Önizleme */}
                    <div
                      className="w-12 h-12 rounded-lg border border-white/20 flex-shrink-0 flex items-center justify-center"
                      style={{ 
                        backgroundColor: getPreviewGradient(displayColor),
                        boxShadow: isActive ? `0 0 12px ${getPreviewGradient(displayColor)}` : 'none'
                      }}
                    >
                      <Icon className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm">{mode.name}</h4>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-[#00C781]/20 text-[#00C781] rounded text-[9px] font-bold">AKTİF</span>
                        )}
                      </div>
                      <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{mode.description}</p>
                      
                      {/* Etiketler */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {mode.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-[9px] text-[#52525B]">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Bilimsel not */}
                      <p className="text-[10px] text-[#52525B] mt-1 font-mono">{mode.science}</p>
                    </div>
                  </div>

                  {/* Kanal değerleri */}
                  <div className="flex gap-2 mt-3 justify-center">
                    {[
                      { k: 'r', c: '#FF3B30', l: 'K' },
                      { k: 'g', c: '#34C759', l: 'Y' },
                      { k: 'b', c: '#007AFF', l: 'M' },
                      { k: 'ww', c: '#FFD60A', l: 'SB' },
                      { k: 'cw', c: '#E5E5EA', l: 'SoB' },
                    ].map(({ k, c, l }) => (
                      <div key={k} className="flex flex-col items-center">
                        <span className="text-[9px] font-bold" style={{ color: c }}>{l}</span>
                        <span className="text-[10px] font-mono">{displayColor[k]}%</span>
                      </div>
                    ))}
                  </div>
                </button>

                {/* Aktif mod için ince ayar */}
                {isActive && (
                  <div className="bg-white/5 rounded-b-lg p-4 space-y-3 border border-t-0 border-white/10">
                    <p className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">İnce Ayar</p>
                    {[
                      { ch: 'r', label: 'Kırmızı', color: '#FF3B30' },
                      { ch: 'g', label: 'Yeşil', color: '#34C759' },
                      { ch: 'b', label: 'Mavi', color: '#007AFF' },
                      { ch: 'ww', label: 'Sıcak B.', color: '#FFD60A' },
                      { ch: 'cw', label: 'Soğuk B.', color: '#E5E5EA' },
                    ].map(({ ch, label, color }) => (
                      <div key={ch} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold w-12 truncate" style={{ color }}>{label}</span>
                        <Slider
                          value={[displayColor[ch]]}
                          onValueChange={(v) => adjustModeColor(mode, ch, v)}
                          max={100} step={1} trackColor={color}
                          className="flex-1"
                        />
                        <span className="text-xs font-mono w-8 text-right">{displayColor[ch]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bilgi Kartı */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          BİLGİ
        </h3>
        <div className="space-y-3 text-xs text-[#A1A1AA]">
          <div className="flex gap-2">
            <span className="text-[#FF3B30] font-bold min-w-[60px]">Kırmızı:</span>
            <span>660nm - Fotosentez ana dalga boyu. Yaprak büyümesi, çiçeklenme.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#007AFF] font-bold min-w-[60px]">Mavi:</span>
            <span>450nm - Kompakt büyüme, klorofil üretimi. Fazlası yosun riski!</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#34C759] font-bold min-w-[60px]">Yeşil:</span>
            <span>500-570nm - Kanopi altına nüfuz. Görsel denge.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#FFD60A] font-bold min-w-[60px]">Sıcak B:</span>
            <span>3000K - Kırmızı spektrumu güçlendirir, doğal sıcaklık.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#E5E5EA] font-bold min-w-[60px]">Soğuk B:</span>
            <span>6500K - Gün ışığı benzeri. Genel fotosentez spektrumu.</span>
          </div>
          <div className="mt-3 p-3 bg-[#FFD60A]/10 border border-[#FFD60A]/20 rounded-lg">
            <p className="text-[#FFD60A] font-bold mb-1">Hightech İpucu</p>
            <p>CO2 enjeksiyonlu tanklarda 7-8 saat ışık süresi ideal. Işığı %50'den başlayıp haftada %5 artırın. Yosun görürseniz mavi kanalı azaltın.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantedModesPanel;
