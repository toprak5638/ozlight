import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Clock, Plus, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { SP630E_COMMANDS } from '../lib/sp630e-protocol';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_MAP = {
  'Pzt': 'Mon', 'Sal': 'Tue', 'Çar': 'Wed',
  'Per': 'Thu', 'Cum': 'Fri', 'Cmt': 'Sat', 'Paz': 'Sun'
};
const DAY_MAP_REVERSE = Object.fromEntries(Object.entries(DAY_MAP).map(([k, v]) => [v, k]));

const SchedulePanel = ({ device, characteristic }) => {
  const [schedules, setSchedules] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '18:00',
    endTime: '23:00',
    selectedDays: [],
    action: 'on', // 'on' veya 'off'
    color: { red: 100, green: 100, blue: 100, warm_white: 50, cool_white: 50 }
  });
  const timerRef = useRef(null);

  useEffect(() => {
    loadSchedules();
    // Her dakika zamanlayıcıları kontrol et
    timerRef.current = setInterval(checkSchedules, 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await axios.get(`${API}/schedules`, {
        params: device ? { device_id: device.id } : {}
      });
      setSchedules(response.data);
    } catch (error) {
      console.error('Zamanlayıcı yükleme hatası:', error);
    }
  };

  // Zamanı kontrol et ve komut gönder
  const checkSchedules = async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = dayNames[now.getDay()];

    for (const schedule of schedules) {
      if (!schedule.enabled) continue;
      if (!schedule.days.includes(today)) continue;

      if (schedule.start_time === currentTime) {
        toast.success(`Zamanlayıcı aktif: ${schedule.name}`);
        if (characteristic) {
          try {
            await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOn());
            await new Promise(r => setTimeout(r, 50));
            const result = SP630E_COMMANDS.setRGBWW(
              schedule.color.red, schedule.color.green, schedule.color.blue,
              schedule.color.warm_white, schedule.color.cool_white
            );
            for (const cmd of result.commands) {
              await characteristic.writeValueWithoutResponse(cmd);
              await new Promise(r => setTimeout(r, 30));
            }
          } catch (e) {
            console.warn('Zamanlayıcı komut hatası:', e);
          }
        }
      }

      if (schedule.end_time === currentTime) {
        toast.info(`Zamanlayıcı kapandı: ${schedule.name}`);
        if (characteristic) {
          try {
            await characteristic.writeValueWithoutResponse(SP630E_COMMANDS.powerOff());
          } catch (e) {
            console.warn('Kapatma hatası:', e);
          }
        }
      }
    }
  };

  const createSchedule = async () => {
    if (!formData.name.trim()) {
      toast.error('İsim girin!');
      return;
    }
    if (formData.selectedDays.length === 0) {
      toast.error('En az bir gün seçin!');
      return;
    }

    try {
      await axios.post(`${API}/schedules`, {
        name: formData.name,
        device_id: device?.id || 'demo-device',
        color: formData.color,
        start_time: formData.startTime,
        end_time: formData.endTime,
        days: formData.selectedDays,
        enabled: true
      });

      toast.success('Zamanlayıcı oluşturuldu!');
      setShowCreateForm(false);
      setFormData({
        name: '', startTime: '18:00', endTime: '23:00',
        selectedDays: [], action: 'on',
        color: { red: 100, green: 100, blue: 100, warm_white: 50, cool_white: 50 }
      });
      loadSchedules();
    } catch (error) {
      toast.error('Oluşturulamadı!');
    }
  };

  const toggleSchedule = async (scheduleId, currentEnabled) => {
    try {
      await axios.put(`${API}/schedules/${scheduleId}/toggle`, null, {
        params: { enabled: !currentEnabled }
      });
      loadSchedules();
    } catch (error) {
      toast.error('Durum değiştirilemedi!');
    }
  };

  const deleteSchedule = async (scheduleId) => {
    try {
      await axios.delete(`${API}/schedules/${scheduleId}`);
      toast.success('Zamanlayıcı silindi!');
      loadSchedules();
    } catch (error) {
      toast.error('Silinemedi!');
    }
  };

  const toggleDay = (day) => {
    const englishDay = DAY_MAP[day];
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(englishDay)
        ? prev.selectedDays.filter(d => d !== englishDay)
        : [...prev.selectedDays, englishDay]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Yeni Zamanlayıcı */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-medium mb-4" style={{ fontFamily: 'Outfit' }}>
          ZAMANLAYICI
        </h3>
        
        {!showCreateForm ? (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="w-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-lg font-bold uppercase tracking-wider transition-all border border-white/10"
            data-testid="show-create-schedule-button"
          >
            <Plus className="w-5 h-5 mr-2" />
            YENİ ZAMANLAYICI
          </Button>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Zamanlayıcı adı..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-[#0A0A0A] border-white/10"
              data-testid="schedule-name-input"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#00C781] block mb-2">
                  <Power className="w-3 h-3 inline mr-1" />Açılma
                </label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="bg-[#0A0A0A] border-white/10"
                  data-testid="schedule-start-time"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF3B30] block mb-2">
                  <PowerOff className="w-3 h-3 inline mr-1" />Kapanma
                </label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="bg-[#0A0A0A] border-white/10"
                  data-testid="schedule-end-time"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA] mb-2 block">Günler</label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day) => {
                  const englishDay = DAY_MAP[day];
                  const isSelected = formData.selectedDays.includes(englishDay);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`p-2 rounded-lg border font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-[#007AFF] border-[#007AFF] text-white'
                          : 'bg-white/5 border-white/10 text-[#A1A1AA]'
                      }`}
                      data-testid={`day-button-${day}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Renk Ayarı */}
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Açılma Rengi</label>
              {[
                { key: 'red', label: 'K', color: '#FF3B30' },
                { key: 'green', label: 'Y', color: '#34C759' },
                { key: 'blue', label: 'M', color: '#007AFF' },
                { key: 'warm_white', label: 'SB', color: '#FFD60A' },
                { key: 'cool_white', label: 'SoB', color: '#E5E5EA' },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs font-bold w-6" style={{ color }}>{label}</span>
                  <Slider
                    value={[formData.color[key]]}
                    onValueChange={(v) => setFormData(prev => ({
                      ...prev, color: { ...prev.color, [key]: v[0] }
                    }))}
                    max={100} step={1} trackColor={color} className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">{formData.color[key]}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={createSchedule} className="flex-1 bg-[#00C781] hover:bg-[#00A86B] text-white" data-testid="create-schedule-button">
                Oluştur
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline" className="flex-1 border-white/10" data-testid="cancel-schedule-button">
                İptal
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Zamanlayıcılar Listesi */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-medium mb-4" style={{ fontFamily: 'Outfit' }}>
          AKTİF ZAMANLAYICILAR
        </h3>
        
        {schedules.length === 0 ? (
          <p className="text-center text-[#A1A1AA] py-8">Henüz zamanlayıcı yok</p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="bg-white/5 border border-white/10 rounded-lg p-4" data-testid={`schedule-item-${schedule.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#007AFF]" />
                    <h4 className="font-bold">{schedule.name}</h4>
                  </div>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={() => toggleSchedule(schedule.id, schedule.enabled)}
                    data-testid={`schedule-toggle-${schedule.id}`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#A1A1AA]">
                    <span className="text-[#00C781]">{schedule.start_time}</span>
                    {schedule.end_time && <> - <span className="text-[#FF3B30]">{schedule.end_time}</span></>}
                    <span className="ml-2">{schedule.days.map(d => DAY_MAP_REVERSE[d] || d).join(', ')}</span>
                  </div>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="p-2 hover:bg-white/5 rounded transition-all"
                    data-testid={`delete-schedule-button-${schedule.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePanel;
