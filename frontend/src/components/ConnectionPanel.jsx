import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth, Loader2, Smartphone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { SP630E_CONFIG } from '../lib/sp630e-protocol';
import { scanAndConnect, getPlatformInfo } from '../lib/ble-connection';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConnectionPanel = ({ onConnect, onDemoMode }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const platform = getPlatformInfo();

  const startScan = async () => {
    if (!platform.hasWebBluetooth && !platform.isCapacitor) {
      if (platform.isIOS) {
        toast.error('iOS Safari Bluetooth desteklemiyor. Bluefy tarayıcısını indirin veya native uygulamayı kullanın!', { duration: 8000 });
      } else {
        toast.error('Bu tarayıcıda Bluetooth desteklenmiyor. Chrome veya Edge kullanın.');
      }
      return;
    }

    setIsScanning(true);

    try {
      const connection = await scanAndConnect((status) => {
        switch (status) {
          case 'scanning':
            toast.info('SP630E aranıyor...');
            break;
          case 'connecting':
            toast.info('Bağlanıyor...');
            break;
          case 'connected':
            toast.success('Bağlandı!');
            break;
          case 'disconnected':
            toast.error('Bağlantı kesildi!');
            onConnect(null, null);
            break;
          default:
            break;
        }
      });

      // Backend'e kaydet
      try {
        await axios.post(`${API}/devices/register`, {
          device_id: connection.device.id,
          device_name: connection.device.name,
          device_type: 'sp630e',
          service_uuid: SP630E_CONFIG.SERVICE_UUID,
          characteristic_uuid: SP630E_CONFIG.WRITE_CHAR_UUID,
          is_connected: true
        });
      } catch (error) {
        if (error.response?.status !== 409) {
          console.warn('Backend kayıt hatası:', error);
        }
      }

      // Connection nesnesini parent'a gönder
      // write fonksiyonunu characteristic yerine gönder
      onConnect(connection.device, {
        writeValueWithoutResponse: connection.write
      });

    } catch (error) {
      if (error.name === 'NotFoundError') {
        toast.error('Cihaz bulunamadı. SP630E açık ve menzilde olmalı.');
      } else if (error.name === 'SecurityError') {
        toast.error('Bluetooth izni gerekli.');
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
          {platform.isCapacitor && (
            <span className="inline-block mt-2 px-3 py-1 bg-[#00C781]/20 text-[#00C781] rounded-full text-xs font-bold">
              Native BLE Aktif
            </span>
          )}
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
          <p className="text-xs text-[#52525B] mb-3">Protokol</p>
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

        {/* iOS Bluefy Rehberi (sadece gerektiğinde göster) */}
        {platform.needsBluefy && (
          <div className="bg-[#007AFF]/10 border border-[#007AFF]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-[#007AFF]" />
              <h4 className="font-bold text-sm text-[#007AFF]">iOS Kullanıcıları</h4>
            </div>
            <div className="space-y-2 text-xs text-[#A1A1AA]">
              <p>Safari Bluetooth desteklemiyor. İki seçenek:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li><span className="text-white font-bold">Bluefy</span> tarayıcısını indirin (hızlı çözüm)</li>
                <li><span className="text-white font-bold">Native uygulama</span> kurun (en iyi deneyim)</li>
              </ol>
              <a 
                href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[#007AFF] font-bold hover:underline"
                data-testid="bluefy-link"
              >
                <ExternalLink className="w-3 h-3" />
                Bluefy'ı İndir
              </a>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors"
          data-testid="install-guide-toggle"
        >
          {showGuide ? 'Rehberi gizle' : 'Ana ekrana nasıl eklenir?'}
        </button>

        {showGuide && (
          <div className="bg-white/5 rounded-lg p-4 text-left">
            <div className="space-y-1 text-xs text-[#A1A1AA]">
              <p><span className="text-white">iOS (Bluefy):</span> Paylaş {'>'} Ana Ekrana Ekle</p>
              <p><span className="text-white">Android (Chrome):</span> Menü {'>'} Ana Ekrana Ekle</p>
              <p><span className="text-white">Desktop (Chrome):</span> Adres çubuğu {'>'} Yükle</p>
            </div>
          </div>
        )}

        <button
          onClick={onDemoMode}
          className="w-full text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors underline"
          data-testid="demo-mode-button"
        >
          Bluetooth olmadan demo modunda dene
        </button>
      </div>
    </div>
  );
};

export default ConnectionPanel;
