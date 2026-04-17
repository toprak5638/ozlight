import React, { useState } from 'react';
import { Bluetooth, Loader2, Smartphone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { SP630E_CONFIG, SP630E_COMMANDS } from '../lib/sp630e-protocol';
import { scanAndConnect, getPlatformInfo } from '../lib/ble-connection';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConnectionPanel = ({ onConnect, onDemoMode }) => {
  const [isScanning, setIsScanning] = useState(false);
  const platform = getPlatformInfo();

  const startScan = async () => {
    if (!platform.hasWebBluetooth && !platform.isCapacitor) {
      if (platform.isIOS) {
        toast.error('Bluefy tarayıcısını kullanın!', { duration: 5000 });
      } else {
        toast.error('Chrome veya Edge kullanın.');
      }
      return;
    }
    setIsScanning(true);
    try {
      const connection = await scanAndConnect((status) => {
        if (status === 'disconnected') { toast.error('Bağlantı kesildi'); onConnect(null, null); }
      });
      try {
        await axios.post(`${API}/devices/register`, {
          device_id: connection.device.id, device_name: connection.device.name,
          device_type: 'sp630e', service_uuid: SP630E_CONFIG.SERVICE_UUID,
          characteristic_uuid: SP630E_CONFIG.WRITE_CHAR_UUID, is_connected: true
        });
      } catch (e) { /* ok */ }
      toast.success(`${connection.device.name} bağlandı`);
      onConnect(connection.device, { writeValueWithoutResponse: connection.write });
    } catch (error) {
      if (error.name !== 'NotFoundError') toast.error(error.message);
    } finally { setIsScanning(false); }
  };

  return (
    <div className="space-y-8">
      {/* Main Connect Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0A84FF]/10 border border-[#0A84FF]/20 mb-6">
          <Bluetooth className="w-8 h-8 text-[#0A84FF]" strokeWidth={1.5} />
        </div>

        <h2 className="text-2xl font-medium mb-2" style={{ fontFamily: 'Outfit' }}>
          Cihaz Bağlantısı
        </h2>
        <p className="text-sm text-white/40 mb-6">
          SP630E LED kontrolcünüzü bağlayın
        </p>

        <button
          onClick={startScan}
          disabled={isScanning}
          className="w-full py-4 bg-[#0A84FF] hover:bg-[#0A84FF]/90 disabled:opacity-50 text-white rounded-2xl font-medium transition-all flex items-center justify-center gap-2"
          style={{ boxShadow: '0 4px 20px #0A84FF40' }}
          data-testid="scan-button"
        >
          {isScanning ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Aranıyor...</>
          ) : (
            <><Bluetooth className="w-5 h-5" strokeWidth={1.5} /> Cihaz Ara</>
          )}
        </button>
      </div>

      {/* Protocol Info */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Protokol</p>
        <div className="space-y-1.5 text-xs font-mono text-white/30">
          <p>Service: <span className="text-[#0A84FF]">0000ffe0</span></p>
          <p>Char: <span className="text-[#0A84FF]">0000ffe1</span></p>
        </div>
        <div className="flex gap-2 mt-4">
          {['SP630E', 'RGBCCT', '5CH PWM'].map(t => (
            <span key={t} className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-white/40 font-mono">{t}</span>
          ))}
        </div>
      </div>

      {/* iOS Guide */}
      {platform.needsBluefy && (
        <div className="bg-[#0A84FF]/5 border border-[#0A84FF]/10 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-[#0A84FF]" strokeWidth={1.5} />
            <span className="text-sm font-medium text-[#0A84FF]">iOS</span>
          </div>
          <p className="text-xs text-white/40 mb-3">Safari Bluetooth desteklemiyor. Bluefy tarayıcısını indirin.</p>
          <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#0A84FF] font-medium" data-testid="bluefy-link">
            <ExternalLink className="w-3 h-3" /> App Store
          </a>
        </div>
      )}

      {/* Demo Mode */}
      <button
        onClick={onDemoMode}
        className="w-full text-xs text-white/20 hover:text-white/40 transition-colors py-2"
        data-testid="demo-mode-button"
      >
        Demo modunda dene
      </button>
    </div>
  );
};

export default ConnectionPanel;
