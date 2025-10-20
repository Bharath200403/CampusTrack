import requests
import sys
import json
from datetime import datetime
import time

class CampusTrackAPITester:
    def __init__(self, base_url="https://smart-attendance-54.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        self.sessions = {}  # Store session data
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return success, response.status_code, response_data

        except Exception as e:
            return False, 0, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, status, data = self.make_request('GET', '')
        self.log_test("Root API Endpoint", success and data.get('message') == 'CampusTrack API')

    def test_user_registration(self):
        """Test user registration for all roles"""
        test_users = [
            {
                "role": "student",
                "email": f"student_{int(time.time())}@test.edu",
                "password": "TestPass123!",
                "name": "Test Student",
                "department": "Computer Science",
                "student_id": "STU12345"
            },
            {
                "role": "faculty", 
                "email": f"faculty_{int(time.time())}@test.edu",
                "password": "TestPass123!",
                "name": "Test Faculty",
                "department": "Computer Science"
            },
            {
                "role": "admin",
                "email": f"admin_{int(time.time())}@test.edu", 
                "password": "TestPass123!",
                "name": "Test Admin",
                "department": "Administration"
            }
        ]

        for user_data in test_users:
            success, status, response = self.make_request('POST', 'auth/register', user_data, expected_status=200)
            
            if success and 'access_token' in response and 'user' in response:
                self.tokens[user_data['role']] = response['access_token']
                self.users[user_data['role']] = response['user']
                self.log_test(f"Register {user_data['role'].title()}", True)
            else:
                self.log_test(f"Register {user_data['role'].title()}", False, f"Status: {status}, Response: {response}")

    def test_user_login(self):
        """Test user login"""
        for role in ['student', 'faculty', 'admin']:
            if role in self.users:
                login_data = {
                    "email": self.users[role]['email'],
                    "password": "TestPass123!"
                }
                
                success, status, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
                
                if success and 'access_token' in response:
                    self.tokens[role] = response['access_token']  # Update token
                    self.log_test(f"Login {role.title()}", True)
                else:
                    self.log_test(f"Login {role.title()}", False, f"Status: {status}, Response: {response}")

    def test_auth_me(self):
        """Test get current user endpoint"""
        for role in ['student', 'faculty', 'admin']:
            if role in self.tokens:
                success, status, response = self.make_request('GET', 'auth/me', token=self.tokens[role])
                
                if success and response.get('role') == role:
                    self.log_test(f"Get Current User ({role.title()})", True)
                else:
                    self.log_test(f"Get Current User ({role.title()})", False, f"Status: {status}, Response: {response}")

    def test_session_creation(self):
        """Test session creation by faculty"""
        if 'faculty' not in self.tokens:
            self.log_test("Create Session", False, "No faculty token available")
            return

        session_data = {
            "course_name": "Introduction to AI",
            "course_code": "CS301",
            "department": "Computer Science"
        }

        success, status, response = self.make_request('POST', 'sessions', session_data, token=self.tokens['faculty'], expected_status=200)
        
        if success and 'id' in response:
            self.sessions['test_session'] = response
            self.log_test("Create Session", True)
        else:
            self.log_test("Create Session", False, f"Status: {status}, Response: {response}")

    def test_get_sessions(self):
        """Test getting sessions for different roles"""
        for role in ['student', 'faculty', 'admin']:
            if role in self.tokens:
                success, status, response = self.make_request('GET', 'sessions', token=self.tokens[role])
                
                if success and isinstance(response, list):
                    self.log_test(f"Get Sessions ({role.title()})", True)
                else:
                    self.log_test(f"Get Sessions ({role.title()})", False, f"Status: {status}, Response: {response}")

    def test_get_active_sessions(self):
        """Test getting active sessions"""
        if 'student' in self.tokens:
            success, status, response = self.make_request('GET', 'sessions?active_only=true', token=self.tokens['student'])
            
            if success and isinstance(response, list):
                self.log_test("Get Active Sessions", True)
            else:
                self.log_test("Get Active Sessions", False, f"Status: {status}, Response: {response}")

    def test_mark_attendance(self):
        """Test marking attendance by student"""
        if 'student' not in self.tokens or 'test_session' not in self.sessions:
            self.log_test("Mark Attendance", False, "No student token or session available")
            return

        attendance_data = {
            "session_id": self.sessions['test_session']['id'],
            "verification_method": "face"
        }

        success, status, response = self.make_request('POST', 'attendance', attendance_data, token=self.tokens['student'], expected_status=200)
        
        if success and 'confidence_score' in response:
            self.log_test("Mark Attendance", True)
        else:
            self.log_test("Mark Attendance", False, f"Status: {status}, Response: {response}")

    def test_get_attendance_history(self):
        """Test getting attendance history for student"""
        if 'student' not in self.tokens:
            self.log_test("Get Attendance History", False, "No student token available")
            return

        success, status, response = self.make_request('GET', 'attendance/my-history', token=self.tokens['student'])
        
        if success and isinstance(response, list):
            self.log_test("Get Attendance History", True)
        else:
            self.log_test("Get Attendance History", False, f"Status: {status}, Response: {response}")

    def test_get_session_attendance(self):
        """Test getting session attendance for faculty"""
        if 'faculty' not in self.tokens or 'test_session' not in self.sessions:
            self.log_test("Get Session Attendance", False, "No faculty token or session available")
            return

        session_id = self.sessions['test_session']['id']
        success, status, response = self.make_request('GET', f'attendance/session/{session_id}', token=self.tokens['faculty'])
        
        if success and isinstance(response, list):
            self.log_test("Get Session Attendance", True)
        else:
            self.log_test("Get Session Attendance", False, f"Status: {status}, Response: {response}")

    def test_analytics_overview(self):
        """Test analytics overview for all roles"""
        for role in ['student', 'faculty', 'admin']:
            if role in self.tokens:
                success, status, response = self.make_request('GET', 'analytics/overview', token=self.tokens[role])
                
                if success and isinstance(response, dict):
                    self.log_test(f"Analytics Overview ({role.title()})", True)
                else:
                    self.log_test(f"Analytics Overview ({role.title()})", False, f"Status: {status}, Response: {response}")

    def test_analytics_trends(self):
        """Test analytics trends"""
        for role in ['student', 'faculty', 'admin']:
            if role in self.tokens:
                success, status, response = self.make_request('GET', 'analytics/trends', token=self.tokens[role])
                
                if success and 'trends' in response:
                    self.log_test(f"Analytics Trends ({role.title()})", True)
                else:
                    self.log_test(f"Analytics Trends ({role.title()})", False, f"Status: {status}, Response: {response}")

    def test_ai_insights(self):
        """Test AI insights for faculty and admin"""
        for role in ['faculty', 'admin']:
            if role in self.tokens:
                print(f"Testing AI insights for {role}... (this may take a few seconds)")
                success, status, response = self.make_request('GET', 'analytics/ai-insights', token=self.tokens[role])
                
                if success and 'insights' in response:
                    self.log_test(f"AI Insights ({role.title()})", True)
                else:
                    self.log_test(f"AI Insights ({role.title()})", False, f"Status: {status}, Response: {response}")

    def test_end_session(self):
        """Test ending session by faculty"""
        if 'faculty' not in self.tokens or 'test_session' not in self.sessions:
            self.log_test("End Session", False, "No faculty token or session available")
            return

        session_id = self.sessions['test_session']['id']
        success, status, response = self.make_request('POST', f'sessions/{session_id}/end', token=self.tokens['faculty'])
        
        if success and response.get('message'):
            self.log_test("End Session", True)
        else:
            self.log_test("End Session", False, f"Status: {status}, Response: {response}")

    def test_unauthorized_access(self):
        """Test unauthorized access scenarios"""
        # Test without token (backend returns 403 for missing token)
        success, status, response = self.make_request('GET', 'auth/me', expected_status=403)
        self.log_test("Unauthorized Access (No Token)", status == 403)

        # Test student trying to create session
        if 'student' in self.tokens:
            session_data = {
                "course_name": "Unauthorized Session",
                "course_code": "UNAUTH",
                "department": "Test"
            }
            success, status, response = self.make_request('POST', 'sessions', session_data, token=self.tokens['student'], expected_status=403)
            self.log_test("Unauthorized Session Creation (Student)", status == 403)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting CampusTrack API Tests...")
        print("=" * 50)

        # Basic tests
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me()
        
        # Session management tests
        self.test_session_creation()
        self.test_get_sessions()
        self.test_get_active_sessions()
        
        # Attendance tests
        self.test_mark_attendance()
        self.test_get_attendance_history()
        self.test_get_session_attendance()
        
        # Analytics tests
        self.test_analytics_overview()
        self.test_analytics_trends()
        self.test_ai_insights()
        
        # Session cleanup
        self.test_end_session()
        
        # Security tests
        self.test_unauthorized_access()

        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CampusTrackAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "test_results": tester.test_results,
            "users_created": tester.users,
            "sessions_created": tester.sessions
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())