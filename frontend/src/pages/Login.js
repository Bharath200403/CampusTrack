import { useState } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    department: '',
    student_id: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      const { access_token, user } = response.data;
      
      onLogin(user, access_token);
      toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk' }}>CampusTrack</h1>
          <p className="text-gray-600">Smart Attendance System</p>
        </div>

        <Card className="glass-effect shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-center" style={{ fontFamily: 'Space Grotesk' }}>
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
                <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      data-testid="login-password-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" 
                    disabled={loading}
                    data-testid="login-submit-btn"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      data-testid="register-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      data-testid="register-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      data-testid="register-password-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-role">Role</Label>
                    <Select name="role" value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                      <SelectTrigger data-testid="register-role-select">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-department">Department</Label>
                    <Input
                      id="register-department"
                      name="department"
                      placeholder="Computer Science"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      data-testid="register-department-input"
                    />
                  </div>
                  {formData.role === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="register-student-id">Student ID</Label>
                      <Input
                        id="register-student-id"
                        name="student_id"
                        placeholder="STU12345"
                        value={formData.student_id}
                        onChange={handleChange}
                        data-testid="register-student-id-input"
                      />
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" 
                    disabled={loading}
                    data-testid="register-submit-btn"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </TabsContent>
              </form>
            </Tabs>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-around text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>For Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span>For Faculty</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span>For Admin</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;