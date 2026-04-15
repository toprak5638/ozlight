import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Trash2, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PresetsPanel = ({ channels, setChannels, characteristic, device }) => {
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await axios.get(`${API}/presets`);
      setPresets(response.data);
    } catch (error) {
      console.error('Preset yükleme hatası:', error);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Lütfen preset için bir isim girin!');
      return;
    }

    try {
      await axios.post(`${API}/presets`, {
        name: presetName,
        color: {
          red: channels.red,
          green: channels.green,
          blue: channels.blue,
          warm_white: channels.warmWhite,
          cool_white: channels.coolWhite
        },
        is_favorite: false
      });

      toast.success('Preset kaydedildi!');
      setPresetName('');
      setShowSaveForm(false);
      loadPresets();
    } catch (error) {
      toast.error('Preset kaydedilemedi!');
    }
  };

  const loadPreset = async (preset) => {
    setChannels({
      red: preset.color.red,
      green: preset.color.green,
      blue: preset.color.blue,
      warmWhite: preset.color.warm_white,
      coolWhite: preset.color.cool_white
    });

    if (characteristic) {
      try {
        const commandBytes = new Uint8Array([
          preset.color.red,
          preset.color.green,
          preset.color.blue,
          preset.color.warm_white,
          preset.color.cool_white
        ]);
        await characteristic.writeValueWithoutResponse(commandBytes);
        toast.success(`"${preset.name}" preset yüklendi!`);
      } catch (error) {
        toast.error('Preset yüklenemedi!');
      }
    }
  };

  const deletePreset = async (presetId) => {
    try {
      await axios.delete(`${API}/presets/${presetId}`);
      toast.success('Preset silindi!');
      loadPresets();
    } catch (error) {
      toast.error('Preset silinemedi!');
    }
  };

  const toggleFavorite = async (preset) => {
    try {
      await axios.put(`${API}/presets/${preset.id}/favorite`, null, {
        params: { is_favorite: !preset.is_favorite }
      });
      loadPresets();
    } catch (error) {
      toast.error('Favori durumu değiştirilemedi!');
    }
  };

  const getPreviewColor = (color) => {
    const r = Math.round(color.red * 2.55);
    const g = Math.round(color.green * 2.55);
    const b = Math.round(color.blue * 2.55);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="space-y-6">
      {/* Save Current State */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          MEVCUT AYARI KAYDET
        </h3>
        
        {!showSaveForm ? (
          <Button
            onClick={() => setShowSaveForm(true)}
            className="w-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-lg font-bold uppercase tracking-wider transition-all border border-white/10"
            data-testid="show-save-form-button"
          >
            <Save className="w-5 h-5 mr-2" />
            YENİ PRESET KAYDET
          </Button>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Preset adı..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="bg-[#0A0A0A] border-white/10"
              data-testid="preset-name-input"
            />
            <div className="flex gap-2">
              <Button
                onClick={savePreset}
                className="flex-1 bg-[#00C781] hover:bg-[#00A86B] text-white"
                data-testid="save-preset-button"
              >
                Kaydet
              </Button>
              <Button
                onClick={() => {
                  setShowSaveForm(false);
                  setPresetName('');
                }}
                variant="outline"
                className="flex-1 border-white/10"
                data-testid="cancel-save-button"
              >
                İptal
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Presets List */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          KAYDEDİLMİŞ PRESET'LER
        </h3>
        
        {presets.length === 0 ? (
          <p className="text-center text-[#A1A1AA] py-8">Henüz preset kaydedilmemiş</p>
        ) : (
          <div className="space-y-3">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                data-testid={`preset-item-${preset.id}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border border-white/10 flex-shrink-0"
                    style={{ backgroundColor: getPreviewColor(preset.color) }}
                  ></div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{preset.name}</h4>
                    <p className="text-xs text-[#A1A1AA] font-mono">
                      R:{preset.color.red} G:{preset.color.green} B:{preset.color.blue}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorite(preset)}
                      className="p-2 hover:bg-white/5 rounded transition-all"
                      data-testid={`favorite-button-${preset.id}`}
                    >
                      <Star 
                        className={`w-5 h-5 ${
                          preset.is_favorite ? 'fill-[#FFD60A] text-[#FFD60A]' : 'text-[#52525B]'
                        }`} 
                      />
                    </button>
                    <button
                      onClick={() => loadPreset(preset)}
                      className="p-2 hover:bg-white/5 rounded transition-all"
                      data-testid={`load-button-${preset.id}`}
                    >
                      <Download className="w-5 h-5 text-[#007AFF]" />
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="p-2 hover:bg-white/5 rounded transition-all"
                      data-testid={`delete-button-${preset.id}`}
                    >
                      <Trash2 className="w-5 h-5 text-[#FF3B30]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresetsPanel;
