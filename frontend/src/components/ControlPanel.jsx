import React, { useRef, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Power, PowerOff } from 'lucide-react';
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
  const sendTimeoutRef = useRef(null);
  const lastSentRef = useRef(null);

  // Debounced BLE komut gönderimi (150ms)
  const sendBLECommand = useCallback((newChannels) => {
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
    }

    sendTimeoutRef.current = setTimeout(async () => {
      const ch = newChannels;
      
      if (characteristic) {
        try {
          const result = SP630E_COMMANDS.setRGBWW(
            ch.red, ch.green, ch.blue, ch.warmWhite, ch.coolWhite
          );
          for (const cmd of result.commands) {
            await characteristic.writeValueWithoutResponse(cmd);
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        } catch (error) {
          console.warn('BLE komut hatası:', error);
        }
      }

      // Backend log (sessiz)
      try {
        if (device) {
          await axios.post(`${API}/commands/send`, {
            device_id: device.id,
            color: {
              red: ch.red, green: ch.green, blue: ch.blue,
              warm_white: ch.warmWhite, cool_white: ch.coolWhite
            }
          });
        }
      } catch (e) { /* sessiz */ }

      lastSentRef.current = ch;
    }, 150);
  }, [characteristic, device]);

  const updateChannel = (channel, value) => {
    const newChannels = { ...channels, [channel]: value[0] };
    setChannels(newChannels);
    sendBLECommand(newChannels);
  };

  const powerOn = async () => {
    const newChannels = { red: 100, green: 100, blue: 100, warmWhite: 100, coolWhite: 100 };
    setChannels(newChannels);
    if (characteristic) {
      try {
        await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOn());
        await new Promise(r => setTimeout(r, 50));
        const result = SP630E_COMMANDS.setRGBWW(100, 100, 100, 100, 100);
        for (const cmd of result.commands) {
          await characteristic.writeValueWithoutResponse(cmd);
          await new Promise(r => setTimeout(r, 30));
        }
      } catch (error) {
        toast.error(`Hata: ${error.message}`);
      }
    }
  };

  const powerOff = async () => {
    const newChannels = { red: 0, green: 0, blue: 0, warmWhite: 0, coolWhite: 0 };
    setChannels(newChannels);
    if (characteristic) {
      try {
        await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOff());
      } catch (error) {
        toast.error(`Hata: ${error.message}`);
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
      {/* Preview */}
      <div 
        className="h-28 rounded-lg flex items-center justify-center transition-all duration-200 border border-white/10"
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

      {/* Channel Sliders - Anlık komut gönderir */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-6">
        {CHANNEL_CONFIG.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color }}>
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
      </div>
    </div>
  );
};

export default ControlPanel;
