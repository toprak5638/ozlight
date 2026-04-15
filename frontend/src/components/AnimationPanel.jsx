import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Zap, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { SP630E_CONFIG, SP630E_COMMANDS } from '../lib/sp630e-protocol';

const PWM_EFFECTS = [
  { id: 0x01, name: '7 Renk Atlama', icon: 'shuffle' },
  { id: 0x02, name: '7 Renk Nefes', icon: 'wind' },
  { id: 0x03, name: '7 Renk Stroboskop', icon: 'zap' },
  { id: 0x04, name: '7 Renk Nabız', icon: 'heart' },
  { id: 0x05, name: '7 Renk Gradyan', icon: 'palette' },
  { id: 0x06, name: 'Kırmızı Nefes', icon: 'wind' },
  { id: 0x07, name: 'Yeşil Nefes', icon: 'wind' },
  { id: 0x08, name: 'Mavi Nefes', icon: 'wind' },
  { id: 0x09, name: 'Sarı Nefes', icon: 'wind' },
  { id: 0x0A, name: 'Cyan Nefes', icon: 'wind' },
  { id: 0x0B, name: 'Mor Nefes', icon: 'wind' },
  { id: 0x0C, name: 'Beyaz Nefes', icon: 'wind' },
];

const AnimationPanel = ({ characteristic, device }) => {
  const [activeEffect, setActiveEffect] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const softAnimRef = useRef(null);

  useEffect(() => {
    return () => {
      if (softAnimRef.current) clearInterval(softAnimRef.current);
    };
  }, []);

  const activateEffect = async (effect) => {
    if (!characteristic) {
      // Demo mod: Yazılım bazlı animasyon
      if (softAnimRef.current) clearInterval(softAnimRef.current);
      setActiveEffect(effect.id);
      setIsPlaying(true);
      toast.success(`${effect.name} aktif (demo)`);
      return;
    }

    try {
      // Dinamik renk moduna geç ve efekti ayarla
      const modeCmd = SP630E_COMMANDS.setModeEffect(
        SP630E_CONFIG.MODES.DYNAMIC_COLOR,
        effect.id
      );
      await characteristic.writeValueWithoutResponse(modeCmd);

      // Hız ayarla
      await new Promise(resolve => setTimeout(resolve, 50));
      const speedCmd = SP630E_COMMANDS.setEffectSpeed(speed);
      await characteristic.writeValueWithoutResponse(speedCmd);

      setActiveEffect(effect.id);
      setIsPlaying(true);
      toast.success(`${effect.name} efekti aktif!`);
    } catch (error) {
      toast.error(`Efekt hatası: ${error.message}`);
    }
  };

  const stopEffect = async () => {
    if (softAnimRef.current) {
      clearInterval(softAnimRef.current);
      softAnimRef.current = null;
    }

    if (characteristic) {
      try {
        // Statik moda geri dön
        const modeCmd = SP630E_COMMANDS.setModeEffect(
          SP630E_CONFIG.MODES.STATIC_COLOR,
          0x01
        );
        await characteristic.writeValueWithoutResponse(modeCmd);
      } catch (error) {
        toast.error(`Durdurma hatası: ${error.message}`);
      }
    }

    setIsPlaying(false);
    setActiveEffect(null);
    toast.info('Efekt durduruldu');
  };

  const updateSpeed = async (newSpeed) => {
    setSpeed(newSpeed[0]);
    
    if (characteristic && isPlaying) {
      try {
        const speedCmd = SP630E_COMMANDS.setEffectSpeed(newSpeed[0]);
        await characteristic.writeValueWithoutResponse(speedCmd);
      } catch (error) {
        console.warn('Hız güncelleme hatası:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Effect Speed Control */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          EFEKT HIZI
        </h3>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Hız</span>
          <span className="text-2xl font-medium text-[#007AFF]" style={{ fontFamily: 'JetBrains Mono, monospace' }} data-testid="speed-value">
            {speed}
          </span>
        </div>
        <Slider
          value={[speed]}
          onValueChange={updateSpeed}
          min={1}
          max={10}
          step={1}
          trackColor="#007AFF"
          data-testid="speed-slider"
        />
      </div>

      {/* PWM Dynamic Effects */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          DİNAMİK EFEKTLER
        </h3>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {PWM_EFFECTS.map((effect) => (
            <button
              key={effect.id}
              onClick={() => activateEffect(effect)}
              className={`p-3 rounded-lg border font-bold text-xs transition-all ${
                activeEffect === effect.id && isPlaying
                  ? 'bg-[#007AFF] border-[#007AFF] text-white'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
              data-testid={`effect-button-${effect.id}`}
            >
              <Zap className="w-4 h-4 mx-auto mb-1" />
              <span className="block truncate">{effect.name}</span>
            </button>
          ))}
        </div>

        {isPlaying ? (
          <Button
            onClick={stopEffect}
            className="w-full h-12 bg-[#FF3B30] hover:bg-[#CC2E26] text-white rounded-lg font-bold uppercase tracking-wider transition-all border border-white/10"
            data-testid="stop-animation-button"
          >
            <Pause className="w-5 h-5 mr-2" />
            DURDUR
          </Button>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-[#A1A1AA]">
              Bir efekt seçerek LED'lerinizi canlandırın
            </p>
          </div>
        )}
      </div>

      {/* Protocol Info */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          PROTOKOL
        </h3>
        <div className="space-y-2 text-xs text-[#A1A1AA] font-mono">
          <p>Komut: <span className="text-white">0x53 [CMD] 0x00 0x01 0x00 [LEN] [DATA]</span></p>
          <p>Mod: <span className="text-white">0x53 0x53 ... [mode] [effect]</span></p>
          <p>Hız: <span className="text-white">0x53 0x54 ... [1-10]</span></p>
        </div>
      </div>
    </div>
  );
};

export default AnimationPanel;
