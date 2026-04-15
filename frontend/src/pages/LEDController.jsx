import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bluetooth, SlidersHorizontal, Star, Clock, Zap, Settings } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import ConnectionPanel from '../components/ConnectionPanel';
import ControlPanel from '../components/ControlPanel';
import PresetsPanel from '../components/PresetsPanel';
import SchedulePanel from '../components/SchedulePanel';
import AnimationPanel from '../components/AnimationPanel';

const LEDController = () => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [characteristic, setCharacteristic] = useState(null);
  const [channels, setChannels] = useState({
    red: 0,
    green: 0,
    blue: 0,
    warmWhite: 0,
    coolWhite: 0
  });

  useEffect(() => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth API bu tarayıcıda desteklenmiyor. Chrome veya Edge kullanın.');
    }
  }, []);

  const handleConnect = (device, char) => {
    setSelectedDevice(device);
    setCharacteristic(char);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
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
                value="presets" 
                className="data-[state=active]:bg-white/10 text-xs"
                data-testid="presets-tab"
              >
                <Star className="w-4 h-4" />
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

            <TabsContent value="presets" data-testid="presets-content">
              <PresetsPanel 
                channels={channels}
                setChannels={setChannels}
                characteristic={characteristic}
                device={selectedDevice}
              />
            </TabsContent>

            <TabsContent value="schedule" data-testid="schedule-content">
              <SchedulePanel device={selectedDevice} />
            </TabsContent>

            <TabsContent value="animation" data-testid="animation-content">
              <AnimationPanel 
                characteristic={characteristic}
                device={selectedDevice}
              />
            </TabsContent>

            <TabsContent value="settings" data-testid="settings-content">
              <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>AYARLAR</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#A1A1AA] mb-1">Cihaz Adı</p>
                    <p className="font-semibold" data-testid="device-name">{selectedDevice?.name || 'Bilinmeyen'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA] mb-1">Cihaz ID</p>
                    <p className="text-xs font-mono text-[#52525B]" data-testid="device-id">{selectedDevice?.id || 'N/A'}</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full mt-4 px-4 py-3 bg-[#FF3B30] text-white rounded-lg font-bold uppercase tracking-wider hover:translate-y-[-1px] transition-transform border border-white/10"
                    data-testid="disconnect-button"
                  >
                    Bağlantıyı Kes
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default LEDController;
