import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlidersHorizontal, Clock, Zap, Settings, Fish } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import ConnectionPanel from '../components/ConnectionPanel';
import ControlPanel from '../components/ControlPanel';
import SchedulePanel from '../components/SchedulePanel';
import AnimationPanel from '../components/AnimationPanel';
import AquariumPanel from '../components/AquariumPanel';
import { SP630E_COMMANDS } from '../lib/sp630e-protocol';

const STORAGE_KEY = 'sp630e_last_state';

const LEDController = () => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [characteristic, setCharacteristic] = useState(null);
  const [channels, setChannels] = useState(() => {
    // localStorage'dan son durumu yükle
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { red: 0, green: 0, blue: 0, warmWhite: 0, coolWhite: 0 };
  });

  useEffect(() => {
    if (!navigator.bluetooth) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.error('iOS Safari Web Bluetooth desteklemiyor. Bluefy tarayıcısını App Store\'dan indirin!', { duration: 8000 });
      } else {
        toast.error('Web Bluetooth API bu tarayıcıda desteklenmiyor. Chrome veya Edge kullanın.');
      }
    }
  }, []);

  // Kanal değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  }, [channels]);

  // Bağlandığında son durumu cihaza gönder
  const restoreLastState = async (char) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || !char) return;

    try {
      const ch = JSON.parse(saved);
      const hasValues = ch.red > 0 || ch.green > 0 || ch.blue > 0 || ch.warmWhite > 0 || ch.coolWhite > 0;
      
      if (hasValues) {
        // Önce aç
        await char.writeValueWithoutResponse(SP630E_COMMANDS.powerOn());
        await new Promise(r => setTimeout(r, 100));

        // Son durumu gönder
        const result = SP630E_COMMANDS.setRGBWW(ch.red, ch.green, ch.blue, ch.warmWhite, ch.coolWhite);
        for (const cmd of result.commands) {
          await char.writeValueWithoutResponse(cmd);
          await new Promise(r => setTimeout(r, 50));
        }
        toast.success('Son durum geri yüklendi!');
      }
    } catch (e) {
      console.warn('Durum geri yükleme hatası:', e);
    }
  };

  const handleConnect = (device, char) => {
    setSelectedDevice(device);
    setCharacteristic(char);
    setIsConnected(true);
    // Bağlanınca son durumu cihaza gönder
    restoreLastState(char);
  };

  const handleDisconnect = () => {
    // Kapanmadan önce mevcut durumu kaydet (zaten useEffect ile kaydediliyor)
    setSelectedDevice(null);
    setCharacteristic(null);
    setIsConnected(false);
  };

  const enterDemoMode = () => {
    setSelectedDevice({ id: 'demo-device', name: 'SP630E Demo' });
    setIsConnected(true);
    toast.success('Demo modu aktif! Bluetooth olmadan test edebilirsiniz.');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                LED KONTROL
              </h1>
              <p className="text-xs text-[#A1A1AA] mt-1">SP630E RGBWW Controller</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#00C781]' : 'bg-[#FF3B30]'
              } animate-pulse`}></div>
              <span className="text-xs font-bold uppercase tracking-[0.2em]">
                {isConnected ? 'BAĞLI' : 'BAĞLI DEĞİL'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {!isConnected ? (
          <ConnectionPanel onConnect={handleConnect} onDemoMode={enterDemoMode} />
        ) : (
          <Tabs defaultValue="control" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-[#121212] border border-white/10 p-1 rounded-lg mb-6" data-testid="main-tabs">
              <TabsTrigger 
                value="control" 
                className="data-[state=active]:bg-white/10 text-xs"
                data-testid="control-tab"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger 
                value="aquarium" 
                className="data-[state=active]:bg-white/10 text-xs"
                data-testid="aquarium-tab"
              >
                <Fish className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="data-[state=active]:bg-white/10 text-xs"
                data-testid="schedule-tab"
              >
                <Clock className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger 
                value="animation" 
                className="data-[state=active]:bg-white/10 text-xs"
                data-testid="animation-tab"
              >
                <Zap className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="data-[state=active]:bg-white/10 text-xs"
                data-testid="settings-tab"
              >
                <Settings className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="control" data-testid="control-content">
              <ControlPanel 
                channels={channels}
                setChannels={setChannels}
                characteristic={characteristic}
                device={selectedDevice}
              />
            </TabsContent>

            <TabsContent value="aquarium" data-testid="aquarium-content">
              <AquariumPanel 
                characteristic={characteristic}
                device={selectedDevice}
                setChannels={setChannels}
              />
            </TabsContent>

            <TabsContent value="schedule" data-testid="schedule-content">
              <SchedulePanel device={selectedDevice} characteristic={characteristic} />
            </TabsContent>

            <TabsContent value="animation" data-testid="animation-content">
              <AnimationPanel 
                characteristic={characteristic}
                device={selectedDevice}
              />
            </TabsContent>

            <TabsContent value="settings" data-testid="settings-content">
              <div className="space-y-6">
                <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>CİHAZ BİLGİSİ</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#A1A1AA]">Cihaz Adı</span>
                      <span className="font-semibold" data-testid="device-name">{selectedDevice?.name || 'SP630E Demo'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#A1A1AA]">Cihaz ID</span>
                      <span className="text-xs font-mono text-[#52525B]" data-testid="device-id">{selectedDevice?.id || 'demo-device'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#A1A1AA]">Tip</span>
                      <span className="text-sm">5CH PWM RGBCCT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#A1A1AA]">Bağlantı</span>
                      <span className="text-sm text-[#00C781]">Bluetooth LE</span>
                    </div>
                  </div>
                </div>

                {/* Son Kaydedilen Durum */}
                <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>SON DURUM</h3>
                  <p className="text-xs text-[#A1A1AA] mb-3">Cihaz açıldığında bu değerlerle başlar</p>
                  <div className="flex gap-3 justify-center">
                    {[
                      { k: 'red', c: '#FF3B30', l: 'K' },
                      { k: 'green', c: '#34C759', l: 'Y' },
                      { k: 'blue', c: '#007AFF', l: 'M' },
                      { k: 'warmWhite', c: '#FFD60A', l: 'SB' },
                      { k: 'coolWhite', c: '#E5E5EA', l: 'SoB' },
                    ].map(({ k, c, l }) => (
                      <div key={k} className="flex flex-col items-center bg-white/5 rounded-lg p-2 min-w-[48px]">
                        <span className="text-[10px] font-bold" style={{ color: c }}>{l}</span>
                        <span className="text-lg font-mono font-bold" data-testid={`saved-${k}`}>{channels[k]}</span>
                        <span className="text-[9px] text-[#52525B]">%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>BLE PROTOKOL</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="bg-white/5 p-2 rounded">
                      <span className="text-[#A1A1AA]">Service:</span>{' '}
                      <span className="text-[#007AFF]">0000ffe0-0000-1000-8000-00805f9b34fb</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded">
                      <span className="text-[#A1A1AA]">Char:</span>{' '}
                      <span className="text-[#007AFF]">0000ffe1-0000-1000-8000-00805f9b34fb</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded">
                      <span className="text-[#A1A1AA]">Format:</span>{' '}
                      <span className="text-[#34C759]">0x53 [CMD] 0x00 0x01 0x00 [LEN] [DATA]</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-3 bg-[#FF3B30] text-white rounded-lg font-bold uppercase tracking-wider hover:translate-y-[-1px] transition-transform border border-white/10"
                  data-testid="disconnect-button"
                >
                  Bağlantıyı Kes
                </button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default LEDController;
