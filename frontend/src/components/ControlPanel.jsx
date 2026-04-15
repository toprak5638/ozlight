import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Send, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { SP630E_COMMANDS } from '../lib/sp630e-protocol';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CHANNEL_CONFIG = [
  { key: 'red', label: 'KIRMIZI', color: '#FF3B30' },
  { key: 'green', label: 'YEŞİL', color: '#34C759' },
  { key: 'blue', label: 'MAVİ', color: '#007AFF' },
  { key: 'warmWhite', label: 'SICAK BEYAZ', color: '#FFD60A' },
  { key: 'coolWhite', label: 'SOĞUK BEYAZ', color: '#E5E5EA' }
];

const ControlPanel = ({ channels, setChannels, characteristic, device }) => {
  const updateChannel = (channel, value) => {
    setChannels(prev => ({ ...prev, [channel]: value[0] }));
  };

  const sendCommand = async () => {
    try {
      if (characteristic) {
        // Gerçek SP630E protokolü kullan
        const result = SP630E_COMMANDS.setRGBWW(
          channels.red,
          channels.green,
          channels.blue,
          channels.warmWhite,
          channels.coolWhite
        );

        // Tüm komutları sırayla gönder
        for (const cmd of result.commands) {
          await characteristic.writeValueWithoutResponse(cmd);
          // Komutlar arası küçük gecikme
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        toast.success(`Komut gönderildi: ${result.description}`);
      } else {
        toast.info('Demo modu: Komut simüle edildi');
      }

      // Backend'e log kaydet
      try {
        if (device) {
          await axios.post(`${API}/commands/send`, {
            device_id: device.id,
            color: {
              red: channels.red,
              green: channels.green,
              blue: channels.blue,
              warm_white: channels.warmWhite,
              cool_white: channels.coolWhite
            }
          });
        }
      } catch (error) {
        console.warn('Backend log hatası:', error);
      }
    } catch (error) {
      toast.error(`Komut gönderilemedi: ${error.message}`);
    }
  };

  const powerOn = async () => {
    setChannels({ red: 100, green: 100, blue: 100, warmWhite: 100, coolWhite: 100 });
    if (characteristic) {
      try {
        await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOn());
        toast.success('Cihaz açıldı');
      } catch (error) {
        toast.error(`Açma hatası: ${error.message}`);
      }
    }
  };

  const powerOff = async () => {
    setChannels({ red: 0, green: 0, blue: 0, warmWhite: 0, coolWhite: 0 });
    if (characteristic) {
      try {
        await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOff());
        toast.success('Cihaz kapatıldı');
      } catch (error) {
        toast.error(`Kapatma hatası: ${error.message}`);
      }
    }
  };

  const getPreviewColor = () => {
    const r = Math.round(channels.red * 2.55);
    const g = Math.round(channels.green * 2.55);
    const b = Math.round(channels.blue * 2.55);
    const wwContrib = Math.round(channels.warmWhite * 0.8);
    const cwContrib = Math.round(channels.coolWhite * 0.6);
    
    const finalR = Math.min(255, r + wwContrib);
    const finalG = Math.min(255, g + Math.round((wwContrib + cwContrib) * 0.7));
    const finalB = Math.min(255, b + cwContrib);
    
    return `rgb(${finalR}, ${finalG}, ${finalB})`;
  };

  const getGlowIntensity = () => {
    const total = (channels.red + channels.green + channels.blue + channels.warmWhite + channels.coolWhite) / 5;
    return Math.round(total * 0.6);
  };

  return (
    <div className="space-y-6">
      {/* Preview Panel */}
      <div 
        className="h-28 rounded-lg flex items-center justify-center font-bold transition-all duration-300 border border-white/10"
        style={{
          backgroundColor: getPreviewColor(),
          boxShadow: `0 0 ${getGlowIntensity()}px ${getPreviewColor()}, 0 0 ${getGlowIntensity() * 2}px ${getPreviewColor()}`
        }}
        data-testid="color-preview"
      >
        <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          ÖNİZLEME
        </span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={powerOn}
          className="h-10 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
          data-testid="all-on-button"
        >
          <Power className="w-4 h-4 mr-1" />
          HEPSİ AÇ
        </Button>
        <Button
          onClick={powerOff}
          className="h-10 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
          data-testid="all-off-button"
        >
          <PowerOff className="w-4 h-4 mr-1" />
          HEPSİ KAPAT
        </Button>
      </div>

      {/* Channel Sliders */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-6">
        {CHANNEL_CONFIG.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-3">
              <label 
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color }}
              >
                {label}
              </label>
              <span 
                className="text-2xl font-medium tracking-tight"
                style={{ color, fontFamily: 'JetBrains Mono, monospace' }}
                data-testid={`${key}-value`}
              >
                {channels[key]}%
              </span>
            </div>
            <Slider
              value={[channels[key]]}
              onValueChange={(val) => updateChannel(key, val)}
              max={100}
              step={1}
              trackColor={color}
              data-testid={`${key}-slider`}
            />
          </div>
        ))}

        <Button
          onClick={sendCommand}
          className="w-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-lg font-bold uppercase tracking-wider transition-all border border-white/10 mt-4 hover:translate-y-[-1px]"
          data-testid="send-command-button"
        >
          <Send className="w-5 h-5 mr-2" />
          KOMUTU GÖNDER
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;
