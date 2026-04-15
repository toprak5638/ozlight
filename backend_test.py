import requests
import sys
import json
from datetime import datetime

class LEDControllerAPITester:
    def __init__(self, base_url="https://protocol-x-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_preset_id = None
        self.created_schedule_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "", 200)

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_create_preset(self):
        """Test creating a preset"""
        preset_data = {
            "name": f"Test Preset {datetime.now().strftime('%H%M%S')}",
            "color": {
                "red": 100,
                "green": 75,
                "blue": 50,
                "warm_white": 25,
                "cool_white": 10
            },
            "is_favorite": False
        }
        
        success, response = self.run_test(
            "Create Preset",
            "POST",
            "presets",
            200,
            data=preset_data
        )
        
        if success and 'id' in response:
            self.created_preset_id = response['id']
            print(f"   Created preset ID: {self.created_preset_id}")
        
        return success

    def test_list_presets(self):
        """Test listing presets"""
        return self.run_test("List Presets", "GET", "presets", 200)

    def test_toggle_favorite(self):
        """Test toggling preset favorite status"""
        if not self.created_preset_id:
            print("❌ No preset ID available for favorite test")
            return False
            
        return self.run_test(
            "Toggle Favorite",
            "PUT",
            f"presets/{self.created_preset_id}/favorite",
            200,
            params={"is_favorite": True}
        )

    def test_delete_preset(self):
        """Test deleting a preset"""
        if not self.created_preset_id:
            print("❌ No preset ID available for delete test")
            return False
            
        return self.run_test(
            "Delete Preset",
            "DELETE",
            f"presets/{self.created_preset_id}",
            200
        )

    def test_create_schedule(self):
        """Test creating a schedule"""
        schedule_data = {
            "name": f"Test Schedule {datetime.now().strftime('%H%M%S')}",
            "device_id": "demo-device",
            "color": {
                "red": 80,
                "green": 60,
                "blue": 40,
                "warm_white": 30,
                "cool_white": 20
            },
            "start_time": "18:00",
            "days": ["Mon", "Wed", "Fri"],
            "enabled": True
        }
        
        success, response = self.run_test(
            "Create Schedule",
            "POST",
            "schedules",
            200,
            data=schedule_data
        )
        
        if success and 'id' in response:
            self.created_schedule_id = response['id']
            print(f"   Created schedule ID: {self.created_schedule_id}")
        
        return success

    def test_list_schedules(self):
        """Test listing schedules"""
        return self.run_test("List Schedules", "GET", "schedules", 200)

    def test_toggle_schedule(self):
        """Test toggling schedule enabled status"""
        if not self.created_schedule_id:
            print("❌ No schedule ID available for toggle test")
            return False
            
        return self.run_test(
            "Toggle Schedule",
            "PUT",
            f"schedules/{self.created_schedule_id}/toggle",
            200,
            params={"enabled": False}
        )

    def test_delete_schedule(self):
        """Test deleting a schedule"""
        if not self.created_schedule_id:
            print("❌ No schedule ID available for delete test")
            return False
            
        return self.run_test(
            "Delete Schedule",
            "DELETE",
            f"schedules/{self.created_schedule_id}",
            200
        )

def main():
    print("🚀 Starting LED Controller API Tests...")
    print("=" * 50)
    
    tester = LEDControllerAPITester()
    
    # Test sequence
    test_results = []
    
    # Basic API tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_api_root())
    
    # Preset tests
    test_results.append(tester.test_create_preset())
    test_results.append(tester.test_list_presets())
    test_results.append(tester.test_toggle_favorite())
    test_results.append(tester.test_delete_preset())
    
    # Schedule tests
    test_results.append(tester.test_create_schedule())
    test_results.append(tester.test_list_schedules())
    test_results.append(tester.test_toggle_schedule())
    test_results.append(tester.test_delete_schedule())
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())