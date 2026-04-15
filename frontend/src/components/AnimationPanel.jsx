import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';

const ANIMATIONS = {
  fade: 'Yumuşak Geçiş',
  pulse: 'Nabız',
  rainbow: 'Gökkuşağı',
  strobe: 'Stroboskop'
};

const AnimationPanel = ({ characteristic, device }) => {
  const [activeAnimation, setActiveAnimation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  const sendColorCommand = async (r, g, b, ww, cw) => {
    if (!characteristic) return;
    
    try {
      const commandBytes = new Uint8Array([r, g, b, ww, cw]);
      await characteristic.writeValueWithoutResponse(commandBytes);
    } catch (error) {
      console.error('Komut gönderme hatası:', error);
    }
  };

  const startAnimation = (type) => {
    if (!characteristic) {
      toast.error('Cihaz bağlı değil!');
      return;
    }

    // Stop current animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    setActiveAnimation(type);
    setIsPlaying(true);
    toast.success(`${ANIMATIONS[type]} animasyonu başlatıldı!`);

    let step = 0;

    switch (type) {
      case 'fade':
        animationRef.current = setInterval(() => {
          const brightness = Math.round((Math.sin(step * 0.1) + 1) * 50);
          sendColorCommand(brightness, brightness, brightness, brightness, brightness);
          step++;
        }, 100);
        break;

      case 'pulse':
        animationRef.current = setInterval(() => {
          const brightness = Math.round((Math.sin(step * 0.2) + 1) * 50);
          sendColorCommand(brightness, 0, brightness, 0, 0);
          step++;
        }, 80);
        break;

      case 'rainbow':
        animationRef.current = setInterval(() => {
          const r = Math.round((Math.sin(step * 0.1) + 1) * 50);
          const g = Math.round((Math.sin(step * 0.1 + 2) + 1) * 50);
          const b = Math.round((Math.sin(step * 0.1 + 4) + 1) * 50);
          sendColorCommand(r, g, b, 0, 0);
          step++;
        }, 150);
        break;

      case 'strobe':
        animationRef.current = setInterval(() => {
          const on = step % 2 === 0;
          sendColorCommand(
            on ? 100 : 0,
            on ? 100 : 0,
            on ? 100 : 0,
            on ? 100 : 0,
            on ? 100 : 0
          );
          step++;
        }, 200);
        break;

      default:
        break;
    }
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setActiveAnimation(null);
    
    // Turn off LEDs
    if (characteristic) {
      sendColorCommand(0, 0, 0, 0, 0);
    }
    
    toast.info('Animasyon durduruldu');
  };

  return (
    <div className="space-y-6">
      {/* Animation Controls */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          ANİMASYON MODLARı
        </h3>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Object.entries(ANIMATIONS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => startAnimation(key)}
              disabled={isPlaying && activeAnimation === key}
              className={`p-4 rounded-lg border font-bold text-sm transition-all ${
                activeAnimation === key && isPlaying
                  ? 'bg-[#007AFF] border-[#007AFF] text-white'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
              data-testid={`animation-button-${key}`}
            >
              <Zap className="w-5 h-5 mx-auto mb-2" />
              {label}
            </button>
          ))}
        </div>

        {isPlaying ? (
          <Button
            onClick={stopAnimation}
            className="w-full h-12 bg-[#FF3B30] hover:bg-[#CC2E26] text-white rounded-lg font-bold uppercase tracking-wider transition-all border border-white/10"
            data-testid="stop-animation-button"
          >
            <Pause className="w-5 h-5 mr-2" />
            DURDUR
          </Button>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[#A1A1AA]">
              Bir animasyon seçin ve LED'leriniz canlanıyor!
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          BİLGİ
        </h3>
        <div className="space-y-2 text-sm text-[#A1A1AA]">
          <p><span className="text-white font-bold">Yumuşak Geçiş:</span> Tüm kanallarda kademeli parlaklık değişimi</p>
          <p><span className="text-white font-bold">Nabız:</span> Mor tonda ritmik nabız efekti</p>
          <p><span className="text-white font-bold">Gökkuşağı:</span> RGB kanallarında dönen renk geçişleri</p>
          <p><span className="text-white font-bold">Stroboskop:</span> Hızlı açma-kapama efekti</p>
        </div>
      </div>
    </div>
  );
};

export default AnimationPanel;
