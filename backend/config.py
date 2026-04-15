from dataclasses import dataclass
from typing import Dict


@dataclass
class BLEDeviceConfig:
    device_type: str
    service_uuid: str
    characteristic_uuid: str
    command_format: str
    byte_order: str


DEVICE_CONFIGS: Dict[str, BLEDeviceConfig] = {
    "rgbww_generic": BLEDeviceConfig(
        device_type="rgbww_generic",
        service_uuid="0000ffe0-0000-1000-8000-00805f9b34fb",
        characteristic_uuid="0000ffe1-0000-1000-8000-00805f9b34fb",
        command_format="5-bytes",
        byte_order="RGBWW"
    ),
    "sp630e": BLEDeviceConfig(
        device_type="sp630e",
        service_uuid="0000ffe0-0000-1000-8000-00805f9b34fb",
        characteristic_uuid="0000ffe1-0000-1000-8000-00805f9b34fb",
        command_format="5-bytes",
        byte_order="RGBWW"
    )
}


def get_device_config(device_type: str) -> BLEDeviceConfig:
    """Cihaz tipine göre konfigürasyon getirir."""
    return DEVICE_CONFIGS.get(device_type, DEVICE_CONFIGS["rgbww_generic"])
