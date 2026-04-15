from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from enum import Enum
from datetime import datetime, timezone
import uuid


class ColorMode(str, Enum):
    RGB = "rgb"
    RGBWW = "rgbww"
    CCT = "cct"


class RGBWWColor(BaseModel):
    """5 kanallı RGBWW renk komutu."""
    red: int = Field(ge=0, le=100, description="Kırmızı kanal 0-100")
    green: int = Field(ge=0, le=100, description="Yeşil kanal 0-100")
    blue: int = Field(ge=0, le=100, description="Mavi kanal 0-100")
    warm_white: int = Field(ge=0, le=100, description="Sıcak beyaz 0-100")
    cool_white: int = Field(ge=0, le=100, description="Soğuk beyaz 0-100")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "red": 100,
                "green": 75,
                "blue": 50,
                "warm_white": 20,
                "cool_white": 10
            }
        }
    )


class BLEDevice(BaseModel):
    """Bağlı BLE cihazını temsil eder."""
    model_config = ConfigDict(extra="ignore")
    
    device_id: str
    device_name: str
    device_type: str = "rgbww_generic"
    service_uuid: str
    characteristic_uuid: str
    is_connected: bool = False
    last_command: Optional[RGBWWColor] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    

class DeviceCommand(BaseModel):
    """Cihaza gönderilecek komut."""
    device_id: str
    color: RGBWWColor
    command_id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))


class CommandResponse(BaseModel):
    """Komut gönderildikten sonraki yanıt."""
    success: bool
    command_id: str
    device_id: str
    message: str = ""


class Preset(BaseModel):
    """Renk preset'i."""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: RGBWWColor
    is_favorite: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PresetCreate(BaseModel):
    """Preset oluşturma."""
    name: str
    color: RGBWWColor
    is_favorite: bool = False


class Schedule(BaseModel):
    """Zamanlayıcı."""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    device_id: str
    color: RGBWWColor
    start_time: str  # HH:MM formatında
    end_time: Optional[str] = None
    days: List[str]  # ["Mon", "Tue", ...]
    enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScheduleCreate(BaseModel):
    """Zamanlayıcı oluşturma."""
    name: str
    device_id: str
    color: RGBWWColor
    start_time: str
    end_time: Optional[str] = None
    days: List[str]
    enabled: bool = True
