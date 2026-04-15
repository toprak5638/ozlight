import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth, Loader2, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { SP630E_CONFIG, SP630E_COMMANDS } from '../lib/sp630e-protocol';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConnectionPanel = ({ onConnect, onDemoMode }) => {
  const [isScanning, setIsScanning] = useState(false);

  const startScan = async () => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth bu tarayıcıda desteklenmiyor! Chrome veya Edge kullanın.');
      return;
    }

    setIsScanning(true);

    try {
      toast.info('SP630E cihazı aranıyor...');

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [SP630E_CONFIG.SERVICE_UUID] },
          { namePrefix: 'SP' },
          { namePrefix: 'LED' },
          { namePrefix: 'BLE' }
        ],
        optionalServices: [
          SP630E_CONFIG.SERVICE_UUID,
          SP630E_CONFIG.VENDOR_SERVICE_UUID
        ]
      });

      toast.info(`${device.name || 'SP630E'} bağlanıyor...`);

      const gattServer = await device.gatt.connect();
      
      let service, characteristic;
      
      // Önce ana servis UUID'i dene
      try {
        service = await gattServer.getPrimaryService(SP630E_CONFIG.SERVICE_UUID);
        characteristic = await service.getCharacteristic(SP630E_CONFIG.WRITE_CHAR_UUID);
        toast.info('Ana BLE servisi bulundu');
      } catch (e) {
        // Ana servis bulunamazsa, vendor servisini dene
        try {
          service = await gattServer.getPrimaryService(SP630E_CONFIG.VENDOR_SERVICE_UUID);
          characteristic = await service.getCharacteristic(SP630E_CONFIG.VENDOR_WRITE_UUID);
          toast.info('Vendor BLE servisi bulundu');
        } catch (e2) {
          throw new Error('Cihaz servisleri bulunamadı. Doğru cihazı seçtiğinizden emin olun.');
        }
      }

      // Bildirim alıcısını ayarla (varsa)
      try {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          const props = char.properties;
          if (props.notify || props.indicate) {
            await char.startNotifications();
            char.addEventListener('characteristicvaluechanged', (event) => {
              const data = new Uint8Array(event.target.value.buffer);
              console.log('SP630E Bildirim:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
            });
            toast.info('Bildirimler aktif');
          }
        }
      } catch (e) {
        console.warn('Bildirim kurulumu başarısız (önemli değil):', e);
      }

      // Durum sorgula
      try {
        const queryCmd = SP630E_COMMANDS.queryState();
        await characteristic.writeValueWithoutResponse(queryCmd);
      } catch (e) {
        console.warn('Durum sorgusu başarısız:', e);
      }

      // Backend'e kaydet
      try {
        await axios.post(`${API}/devices/register`, {
          device_id: device.id,
          device_name: device.name || 'SP630E',
          device_type: 'sp630e',
          service_uuid: SP630E_CONFIG.SERVICE_UUID,
          characteristic_uuid: SP630E_CONFIG.WRITE_CHAR_UUID,
          is_connected: true
        });
      } catch (error) {
        // 409 = zaten kayıtlı, sorun değil
        if (error.response?.status !== 409) {
          console.warn('Backend kayıt hatası:', error);
        }
        try {
          await axios.put(`${API}/devices/${device.id}/connection`, null, {
            params: { is_connected: true }
          });
        } catch (e) {
          console.warn('Bağlantı durumu güncelleme hatası:', e);
        }
      }

      device.addEventListener('gattserverdisconnected', () => {
        toast.error('SP630E bağlantısı kesildi!');
        onConnect(null, null);
      });

      toast.success(`${device.name || 'SP630E'} başarıyla bağlandı!`);
      onConnect(device, characteristic);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        toast.error('Cihaz bulunamadı. SP630E açık ve menzilde olmalı.');
      } else if (error.name === 'SecurityError') {
        toast.error('Bluetooth izni reddedildi. HTTPS gereklidir.');
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
            CİHAZ BAĞLANTISI
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
          <p className="text-xs text-[#52525B] mb-3">Protokol Bilgisi</p>
          <div className="bg-white/5 rounded-lg p-3 text-left">
            <p className="text-xs font-mono text-[#A1A1AA] mb-1">Service: <span className="text-[#007AFF]">0000ffe0-...-00805f9b34fb</span></p>
            <p className="text-xs font-mono text-[#A1A1AA]">Write: <span className="text-[#007AFF]">0000ffe1-...-00805f9b34fb</span></p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">SP630E</span>
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">RGBCCT</span>
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono">5CH PWM</span>
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
