import React, { useRef, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { SP630E_COMMANDS } from '../lib/sp630e-protocol';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CHANNELS = [
  { key: 'red', label: 'R', color: '#FF3B30', glow: '#FF3B3040' },
  { key: 'green', label: 'G', color: '#34C759', glow: '#34C75940' },
  { key: 'blue', label: 'B', color: '#0A84FF', glow: '#0A84FF40' },
  { key: 'warmWhite', label: 'WW', color: '#FFD60A', glow: '#FFD60A40' },
  { key: 'coolWhite', label: 'CW', color: '#5AC8FA', glow: '#5AC8FA40' }
];

const ControlPanel = ({ channels, setChannels, characteristic, device }) => {
  const sendTimeoutRef = useRef(null);

  const sendBLECommand = useCallback((newChannels) => {
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = setTimeout(async () => {
      const ch = newChannels;
      if (characteristic) {
        try {
          const result = SP630E_COMMANDS.setRGBWW(ch.red, ch.green, ch.blue, ch.warmWhite, ch.coolWhite);
          for (const cmd of result.commands) {
            await characteristic.writeValueWithoutResponse(cmd);
            await new Promise(r => setTimeout(r, 30));
          }
        } catch (e) { console.warn('BLE err:', e); }
      }
      try {
        if (device) {
          await axios.post(`${API}/commands/send`, {
            device_id: device.id,
            color: { red: ch.red, green: ch.green, blue: ch.blue, warm_white: ch.warmWhite, cool_white: ch.coolWhite }
          });
        }
      } catch (e) { /* silent */ }
    }, 150);
  }, [characteristic, device]);

  const updateChannel = (channel, value) => {
    const newChannels = { ...channels, [channel]: value[0] };
    setChannels(newChannels);
    sendBLECommand(newChannels);
  };

  const powerOn = async () => {
    const ch = { red: 100, green: 100, blue: 100, warmWhite: 100, coolWhite: 100 };
    setChannels(ch);
    if (characteristic) {
      try {
        await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOn());
        await new Promise(r => setTimeout(r, 50));
        const result = SP630E_COMMANDS.setRGBWW(100, 100, 100, 100, 100);
        for (const cmd of result.commands) { await characteristic.writeValueWithoutResponse(cmd); await new Promise(r => setTimeout(r, 30)); }
      } catch (e) { toast.error(e.message); }
    }
  };

  const powerOff = async () => {
    setChannels({ red: 0, green: 0, blue: 0, warmWhite: 0, coolWhite: 0 });
    if (characteristic) {
      try { await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOff()); } catch (e) { toast.error(e.message); }
    }
  };

  const getPreviewColor = () => {
    const r = Math.round(channels.red * 2.55);
    const g = Math.round(channels.green * 2.55);
    const b = Math.round(channels.blue * 2.55);
    const ww = Math.round(channels.warmWhite * 0.8);
    const cw = Math.round(channels.coolWhite * 0.6);
    return `rgb(${Math.min(255, r + ww)}, ${Math.min(255, g + Math.round((ww + cw) * 0.7))}, ${Math.min(255, b + cw)})`;
  };

  const glowSize = Math.round(((channels.red + channels.green + channels.blue + channels.warmWhite + channels.coolWhite) / 5) * 0.8);

  return (
    <div className="space-y-4">
      {/* Color Preview */}
      <div
        className="h-24 rounded-2xl flex items-center justify-center border border-white/5 transition-all duration-300 relative overflow-hidden"
        style={{
          backgroundColor: getPreviewColor(),
          boxShadow: `0 0 ${glowSize}px ${getPreviewColor()}, 0 4px 30px ${getPreviewColor()}40`
        }}
        data-testid="color-preview"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Power */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={powerOn} className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-medium" data-testid="all-on-button">
          <Power className="w-3.5 h-3.5" strokeWidth={1.5} /> Aç
        </button>
        <button onClick={powerOff} className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-medium" data-testid="all-off-button">
          <PowerOff className="w-3.5 h-3.5" strokeWidth={1.5} /> Kapat
        </button>
      </div>

      {/* Channel Sliders - Compact */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-5">
        {CHANNELS.map(({ key, label, color, glow }) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${glow}` }} />
                <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-white/40">{label}</span>
              </div>
              <span className="text-xl font-light" style={{ color, fontFamily: 'IBM Plex Sans' }} data-testid={`${key}-value`}>
                {channels[key]}
              </span>
            </div>
            <Slider
              value={[channels[key]]}
              onValueChange={(val) => updateChannel(key, val)}
              max={100} step={1} trackColor={color}
              data-testid={`${key}-slider`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ControlPanel;
