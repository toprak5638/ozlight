import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_MAP = {
  'Pzt': 'Mon',
  'Sal': 'Tue',
  'Çar': 'Wed',
  'Per': 'Thu',
  'Cum': 'Fri',
  'Cmt': 'Sat',
  'Paz': 'Sun'
};

const SchedulePanel = ({ device }) => {
  const [schedules, setSchedules] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '18:00',
    selectedDays: []
  });

  useEffect(() => {
    if (device) {
      loadSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  const loadSchedules = async () => {
    if (!device) return;
    
    try {
      const response = await axios.get(`${API}/schedules`, {
        params: { device_id: device.id }
      });
      setSchedules(response.data);
    } catch (error) {
      console.error('Zamanlayıcı yükleme hatası:', error);
    }
  };

  const createSchedule = async () => {
    if (!formData.name.trim()) {
      toast.error('Lütfen zamanlayıcı için bir isim girin!');
      return;
    }

    if (formData.selectedDays.length === 0) {
      toast.error('Lütfen en az bir gün seçin!');
      return;
    }

    try {
      await axios.post(`${API}/schedules`, {
        name: formData.name,
        device_id: device.id,
        color: {
          red: 100,
          green: 100,
          blue: 100,
          warm_white: 50,
          cool_white: 50
        },
        start_time: formData.startTime,
        days: formData.selectedDays,
        enabled: true
      });

      toast.success('Zamanlayıcı oluşturuldu!');
      setShowCreateForm(false);
      setFormData({ name: '', startTime: '18:00', selectedDays: [] });
      loadSchedules();
    } catch (error) {
      toast.error('Zamanlayıcı oluşturulamadı!');
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
      toast.error('Zamanlayıcı silinemedi!');
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
      {/* Create Schedule */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          YENİ ZAMANLA YICI
        </h3>
        
        {!showCreateForm ? (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="w-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-lg font-bold uppercase tracking-wider transition-all border border-white/10"
            data-testid="show-create-schedule-button"
          >
            <Plus className="w-5 h-5 mr-2" />
            ZAMANLA YICI OLUŞTUR
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
            
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA] mb-2 block">
                Başlangıç Saati
              </label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="bg-[#0A0A0A] border-white/10"
                data-testid="schedule-time-input"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA] mb-2 block">
                Günler
              </label>
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

            <div className="flex gap-2 pt-2">
              <Button
                onClick={createSchedule}
                className="flex-1 bg-[#00C781] hover:bg-[#00A86B] text-white"
                data-testid="create-schedule-button"
              >
                Oluştur
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: '', startTime: '18:00', selectedDays: [] });
                }}
                variant="outline"
                className="flex-1 border-white/10"
                data-testid="cancel-schedule-button"
              >
                İptal
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Schedules List */}
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          AKTİF ZAMANLA YICILAR
        </h3>
        
        {schedules.length === 0 ? (
          <p className="text-center text-[#A1A1AA] py-8">Henüz zamanlayıcı oluşturulmamış</p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
                data-testid={`schedule-item-${schedule.id}`}
              >
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
                  <p className="text-sm text-[#A1A1AA]">
                    {schedule.start_time} • {schedule.days.join(', ')}
                  </p>
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
