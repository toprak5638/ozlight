from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from models import (
    BLEDevice, DeviceCommand, CommandResponse, RGBWWColor,
    Preset, PresetCreate, Schedule, ScheduleCreate
)
from config import get_device_config


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(
    title="RGBWW LED Controller",
    description="SP630E ve benzer 5 kanallı LED cihazları için gelişmiş kontrol uygulaması",
    version="1.0.0"
)

api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@api_router.get("/")
async def root():
    return {"message": "RGBWW LED Controller API"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}


@api_router.post("/devices/register", response_model=BLEDevice)
async def register_device(device: BLEDevice):
    """BLE cihazını kaydet."""
    existing = await db.devices.find_one({"device_id": device.device_id}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cihaz zaten kayıtlı: {device.device_id}"
        )
    
    device_dict = device.model_dump()
    device_dict['created_at'] = device_dict['created_at'].isoformat()
    
    await db.devices.insert_one(device_dict)
    logger.info(f"Cihaz kaydedildi: {device.device_name} ({device.device_id})")
    return device


@api_router.get("/devices", response_model=List[BLEDevice])
async def list_devices():
    """Tüm kayıtlı cihazları listele."""
    devices = await db.devices.find({}, {"_id": 0}).to_list(100)
    for device in devices:
        if isinstance(device.get('created_at'), str):
            device['created_at'] = datetime.fromisoformat(device['created_at'])
    return devices


@api_router.get("/devices/{device_id}", response_model=BLEDevice)
async def get_device(device_id: str):
    """Belirli bir cihazın detaylarını getir."""
    device = await db.devices.find_one({"device_id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cihaz bulunamadı: {device_id}"
        )
    if isinstance(device.get('created_at'), str):
        device['created_at'] = datetime.fromisoformat(device['created_at'])
    return device


@api_router.put("/devices/{device_id}/connection")
async def update_device_connection(device_id: str, is_connected: bool):
    """Cihaz bağlantı durumunu güncelle."""
    result = await db.devices.update_one(
        {"device_id": device_id},
        {"$set": {"is_connected": is_connected}}
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cihaz bulunamadı: {device_id}"
        )
    logger.info(f"Cihaz {device_id} bağlantı durumu: {is_connected}")
    return {"device_id": device_id, "is_connected": is_connected}


@api_router.post("/commands/send", response_model=CommandResponse)
async def send_command(command: DeviceCommand):
    """Cihaza renk komutu gönder."""
    device = await db.devices.find_one({"device_id": command.device_id}, {"_id": 0})
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cihaz bulunamadı: {command.device_id}"
        )
    
    command_dict = command.model_dump()
    await db.commands.insert_one(command_dict)
    
    await db.devices.update_one(
        {"device_id": command.device_id},
        {"$set": {"last_command": command.color.model_dump()}}
    )
    
    logger.info(
        f"Komut gönderildi: {command.device_id} - "
        f"R:{command.color.red} G:{command.color.green} B:{command.color.blue} "
        f"WW:{command.color.warm_white} CW:{command.color.cool_white}"
    )
    
    return CommandResponse(
        success=True,
        command_id=command.command_id,
        device_id=command.device_id,
        message="Komut başarıyla gönderildi"
    )


@api_router.post("/presets", response_model=Preset)
async def create_preset(preset: PresetCreate):
    """Yeni preset oluştur."""
    preset_obj = Preset(**preset.model_dump())
    preset_dict = preset_obj.model_dump()
    preset_dict['created_at'] = preset_dict['created_at'].isoformat()
    
    await db.presets.insert_one(preset_dict)
    logger.info(f"Preset oluşturuldu: {preset.name}")
    return preset_obj


@api_router.get("/presets", response_model=List[Preset])
async def list_presets(favorite_only: bool = False):
    """Tüm preset'leri listele."""
    query = {"is_favorite": True} if favorite_only else {}
    presets = await db.presets.find(query, {"_id": 0}).to_list(100)
    for preset in presets:
        if isinstance(preset.get('created_at'), str):
            preset['created_at'] = datetime.fromisoformat(preset['created_at'])
    return presets


@api_router.get("/presets/{preset_id}", response_model=Preset)
async def get_preset(preset_id: str):
    """Belirli bir preset'i getir."""
    preset = await db.presets.find_one({"id": preset_id}, {"_id": 0})
    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preset bulunamadı: {preset_id}"
        )
    if isinstance(preset.get('created_at'), str):
        preset['created_at'] = datetime.fromisoformat(preset['created_at'])
    return preset


@api_router.delete("/presets/{preset_id}")
async def delete_preset(preset_id: str):
    """Preset'i sil."""
    result = await db.presets.delete_one({"id": preset_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preset bulunamadı: {preset_id}"
        )
    logger.info(f"Preset silindi: {preset_id}")
    return {"message": "Preset başarıyla silindi"}


@api_router.put("/presets/{preset_id}/favorite")
async def toggle_favorite(preset_id: str, is_favorite: bool):
    """Preset'i favorilere ekle/çıkar."""
    result = await db.presets.update_one(
        {"id": preset_id},
        {"$set": {"is_favorite": is_favorite}}
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preset bulunamadı: {preset_id}"
        )
    return {"preset_id": preset_id, "is_favorite": is_favorite}


@api_router.post("/schedules", response_model=Schedule)
async def create_schedule(schedule: ScheduleCreate):
    """Yeni zamanlayıcı oluştur."""
    schedule_obj = Schedule(**schedule.model_dump())
    schedule_dict = schedule_obj.model_dump()
    schedule_dict['created_at'] = schedule_dict['created_at'].isoformat()
    
    await db.schedules.insert_one(schedule_dict)
    logger.info(f"Zamanlayıcı oluşturuldu: {schedule.name}")
    return schedule_obj


@api_router.get("/schedules", response_model=List[Schedule])
async def list_schedules(device_id: Optional[str] = None):
    """Zamanlayıcıları listele."""
    query = {"device_id": device_id} if device_id else {}
    schedules = await db.schedules.find(query, {"_id": 0}).to_list(100)
    for schedule in schedules:
        if isinstance(schedule.get('created_at'), str):
            schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
    return schedules


@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """Zamanlayıcıyı sil."""
    result = await db.schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zamanlayıcı bulunamadı: {schedule_id}"
        )
    logger.info(f"Zamanlayıcı silindi: {schedule_id}")
    return {"message": "Zamanlayıcı başarıyla silindi"}


@api_router.put("/schedules/{schedule_id}/toggle")
async def toggle_schedule(schedule_id: str, enabled: bool):
    """Zamanlayıcıyı aktif/pasif yap."""
    result = await db.schedules.update_one(
        {"id": schedule_id},
        {"$set": {"enabled": enabled}}
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zamanlayıcı bulunamadı: {schedule_id}"
        )
    return {"schedule_id": schedule_id, "enabled": enabled}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
