import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, LayoutGrid, Sun, Timer, Settings } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import ConnectionPanel from '../components/ConnectionPanel';
import ControlPanel from '../components/ControlPanel';
import SchedulePanel from '../components/SchedulePanel';
import AquariumPanel from '../components/AquariumPanel';
import PlantedModesPanel from '../components/PlantedModesPanel';
import { SP630E_COMMANDS } from '../lib/sp630e-protocol';

const STORAGE_KEY = 'sp630e_last_state';
const BG_IMAGE = 'https://images.unsplash.com/photo-1721106519595-5a0026848dcb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwyfHxhcXVhcml1bSUyMHBsYW50JTIwZGFyayUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzc2Mjk4MzA1fDA&ixlib=rb-4.1.0&q=85';

const TABS = [
  { id: 'control', label: 'Kontrol', icon: SlidersHorizontal },
  { id: 'modes', label: 'Modlar', icon: LayoutGrid },
  { id: 'aquarium', label: 'Simülasyon', icon: Sun },
  { id: 'schedule', label: 'Zamanlama', icon: Timer },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

const LEDController = () => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [characteristic, setCharacteristic] = useState(null);
  const [activeTab, setActiveTab] = useState('control');
  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return { red: 0, green: 0, blue: 0, warmWhite: 0, coolWhite: 0 };
  });

  useEffect(() => {
    if (!navigator.bluetooth) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.error('iOS Safari Web Bluetooth desteklemiyor. Bluefy indirin!', { duration: 8000 });
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  }, [channels]);

  const restoreLastState = async (char) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || !char) return;
    try {
      const ch = JSON.parse(saved);
      const hasValues = ch.red > 0 || ch.green > 0 || ch.blue > 0 || ch.warmWhite > 0 || ch.coolWhite > 0;
      if (hasValues) {
        await char.writeValueWithoutResponse(SP630E_COMMANDS.powerOn());
        await new Promise(r => setTimeout(r, 100));
        const result = SP630E_COMMANDS.setRGBWW(ch.red, ch.green, ch.blue, ch.warmWhite, ch.coolWhite);
        for (const cmd of result.commands) {
          await char.writeValueWithoutResponse(cmd);
          await new Promise(r => setTimeout(r, 50));
        }
        toast.success('Son durum geri yüklendi');
      }
    } catch (e) { console.warn('Restore error:', e); }
  };

  const handleConnect = (device, char) => {
    setSelectedDevice(device);
    setCharacteristic(char);
    setIsConnected(true);
    restoreLastState(char);
  };

  const handleDisconnect = () => {
    setSelectedDevice(null);
    setCharacteristic(null);
    setIsConnected(false);
  };

  const enterDemoMode = () => {
    setSelectedDevice({ id: 'demo-device', name: 'SP630E Demo' });
    setIsConnected(true);
    toast.success('Demo modu aktif');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'control':
        return <ControlPanel channels={channels} setChannels={setChannels} characteristic={characteristic} device={selectedDevice} />;
      case 'modes':
        return <PlantedModesPanel characteristic={characteristic} device={selectedDevice} setChannels={setChannels} />;
      case 'aquarium':
        return <AquariumPanel characteristic={characteristic} device={selectedDevice} setChannels={setChannels} />;
      case 'schedule':
        return <SchedulePanel device={selectedDevice} characteristic={characteristic} />;
      case 'settings':
        return (
          <div className="space-y-5">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-medium mb-4" style={{ fontFamily: 'Outfit' }}>Cihaz</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Ad</span><span className="font-medium" data-testid="device-name">{selectedDevice?.name || 'SP630E'}</span></div>
                <div className="flex justify-between"><span className="text-white/50">ID</span><span className="text-xs font-mono text-white/30" data-testid="device-id">{selectedDevice?.id || '-'}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Tip</span><span>5CH PWM RGBCCT</span></div>
                <div className="flex justify-between"><span className="text-white/50">Bağlantı</span><span className="text-[#34C759]">BLE</span></div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-medium mb-4" style={{ fontFamily: 'Outfit' }}>Son Durum</h3>
              <div className="flex gap-2 justify-between">
                {[
                  { k: 'red', c: '#FF3B30', l: 'R' },
                  { k: 'green', c: '#34C759', l: 'G' },
                  { k: 'blue', c: '#0A84FF', l: 'B' },
                  { k: 'warmWhite', c: '#FFD60A', l: 'WW' },
                  { k: 'coolWhite', c: '#5AC8FA', l: 'CW' },
                ].map(({ k, c, l }) => (
                  <div key={k} className="flex flex-col items-center bg-white/5 rounded-xl p-3 flex-1">
                    <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}50` }} />
                    <span className="text-lg font-light" style={{ fontFamily: 'IBM Plex Sans' }} data-testid={`saved-${k}`}>{channels[k]}</span>
                    <span className="text-[9px] text-white/30 mt-1">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-medium mb-4" style={{ fontFamily: 'Outfit' }}>Protokol</h3>
              <div className="space-y-2 text-xs font-mono text-white/40">
                <p>Service: <span className="text-[#0A84FF]">0000ffe0-...-00805f9b34fb</span></p>
                <p>Char: <span className="text-[#0A84FF]">0000ffe1-...-00805f9b34fb</span></p>
                <p>CMD: <span className="text-[#34C759]">0x53 [CMD] 0x00 0x01 0x00 [LEN] [DATA]</span></p>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full py-4 bg-[#FF3B30]/10 text-[#FF3B30] rounded-2xl font-medium hover:bg-[#FF3B30]/20 transition-colors border border-[#FF3B30]/20"
              data-testid="disconnect-button"
            >
              Bağlantıyı Kes
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-white relative">
      <Toaster position="top-center" richColors />

      {/* Background Image */}
      <div 
        className="fixed inset-0 opacity-[0.07] bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#05050A] via-transparent to-[#05050A] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {!isConnected ? (
          <div className="flex-1 px-6 py-8">
            {/* OzLight Logo */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-light tracking-tighter" style={{ fontFamily: 'Outfit' }} data-testid="app-title">
                Oz<span className="font-semibold">Light</span>
              </h1>
              <p className="text-xs text-white/30 mt-2 tracking-[0.3em] uppercase">Aquarium LED Controller</p>
            </div>
            <ConnectionPanel onConnect={handleConnect} onDemoMode={enterDemoMode} />
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-light tracking-tighter" style={{ fontFamily: 'Outfit' }}>
                  Oz<span className="font-semibold">Light</span>
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`} 
                    style={{ boxShadow: isConnected ? '0 0 8px #34C75980' : '0 0 8px #FF3B3080' }} />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">
                    {isConnected ? 'Bağlı' : 'Bağlı Değil'}
                  </span>
                </div>
              </div>
            </header>

            {/* Tab Content */}
            <main className="flex-1 px-5 py-4 pb-24 overflow-y-auto">
              {renderContent()}
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50">
              <div className="max-w-md mx-auto">
                <div className="bg-[#0D0D14]/90 backdrop-blur-2xl border-t border-white/8 px-2 pt-2 pb-6 flex justify-around items-start" data-testid="bottom-nav">
                  {TABS.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'bg-white/5' : ''}`}
                        data-testid={`nav-tab-${id}`}
                      >
                        <Icon 
                          className={`w-[18px] h-[18px] transition-all ${isActive ? 'text-[#0A84FF]' : 'text-white/25'}`} 
                          strokeWidth={isActive ? 2 : 1.5} 
                        />
                        <span className={`text-[9px] leading-tight transition-all ${isActive ? 'text-[#0A84FF] font-semibold' : 'text-white/25'}`}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>
          </>
        )}
      </div>
    </div>
  );
};

export default LEDController;
