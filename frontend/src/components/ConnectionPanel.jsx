import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConnectionPanel = ({ onConnect, onDemoMode }) => {
  const [isScanning, setIsScanning] = useState(false);

  const startScan = async () => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth bu tarayıcıda desteklenmiyor!');
      return;
    }

    setIsScanning(true);

    try {
      toast.info('Bluetooth cihazları aranıyor...');

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'LED' },
          { namePrefix: 'BLE' },
          { namePrefix: 'SP' }
        ],
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb']
      });

      toast.info(`${device.name || 'Cihaz'} bağlanıyor...`);

      const gattServer = await device.gatt.connect();
      const service = await gattServer.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');

      // Backend'e cihazı kaydet
      try {
        await axios.post(`${API}/devices/register`, {
          device_id: device.id,
          device_name: device.name || 'Bilinmeyen Cihaz',
          device_type: 'sp630e',
          service_uuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
          characteristic_uuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
          is_connected: true
        });

        await axios.put(`${API}/devices/${device.id}/connection`, null, {
          params: { is_connected: true }
        });
      } catch (error) {
        console.warn('Backend kayıt hatası (önemli değil):', error);
      }

      device.addEventListener('gattserverdisconnected', () => {
        toast.error('Cihaz bağlantısı kesildi!');
        onConnect(null, null);
      });

      toast.success(`${device.name || 'Cihaz'} başarıyla bağlandı!`);
      onConnect(device, characteristic);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        toast.error('Hiç cihaz bulunamadı. Cihazınızın açık olduğundan emin olun.');
      } else {
        toast.error(`Bağlantı hatası: ${error.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10">
          <Bluetooth className="w-10 h-10 text-[#007AFF]" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            CIHAZ BAĞLANTISI
          </h2>
          <p className="text-sm text-[#A1A1AA]">
            SP630E LED kontrolcünüzü bağlamak için aşağıdaki butona tıklayın
          </p>
        </div>

        <Button
          onClick={startScan}
          disabled={isScanning}
          className="w-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-lg font-bold uppercase tracking-wider transition-all border border-white/10"
          data-testid="scan-button"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ARANIYOR...
            </>
          ) : (
            <>
              <Bluetooth className="w-5 h-5 mr-2" />
              CİHAZ ARA
            </>
          )}
        </Button>

        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-[#52525B] mb-2">Desteklenen Cihazlar</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">SP630E</span>
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">RGBWW LED</span>
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">BLE 5.0</span>
          </div>
        </div>

        <button
          onClick={onDemoMode}
          className="w-full mt-4 text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors underline"
          data-testid="demo-mode-button"
        >
          Bluetooth olmadan demo modunda dene
        </button>
      </div>
    </div>
  );
};

export default ConnectionPanel;
