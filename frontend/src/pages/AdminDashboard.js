import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LogOut, Users, GraduationCap, BookOpen, TrendingUp, BarChart3 } from 'lucide-react';

const AdminDashboard = ({ user, onLogout }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/analytics/overview`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await axios.get(`${API}/analytics/ai-insights`);
      setAiInsights(response.data.insights);
    } catch (error) {
      toast.error('Failed to fetch AI insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">CT</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>CampusTrack</h1>
                <p className="text-sm text-gray-600">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-400 to-indigo-500">
                <AvatarFallback className="bg-transparent text-white font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={onLogout} data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk' }}>System Overview</h2>
              <p className="text-gray-600">University-wide attendance analytics and insights</p>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAIInsights}
              disabled={loadingInsights}
              data-testid="ai-insights-btn"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {loadingInsights ? 'Loading...' : 'Generate AI Insights'}
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="card-hover border-0 shadow-lg" data-testid="total-users-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>{analytics.total_users}</p>
                <p className="text-gray-600 text-sm mt-1">System-wide users</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg" data-testid="total-students-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>{analytics.total_students}</p>
                <p className="text-gray-600 text-sm mt-1">Enrolled students</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg" data-testid="total-faculty-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Faculty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>{analytics.total_faculty}</p>
                <p className="text-gray-600 text-sm mt-1">Teaching staff</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg" data-testid="total-sessions-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Total Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>{analytics.total_sessions}</p>
                <p className="text-gray-600 text-sm mt-1">Classes conducted</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg" data-testid="attendance-records-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  Attendance Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>{analytics.total_attendance_records}</p>
                <p className="text-gray-600 text-sm mt-1">Total records</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white" data-testid="system-health-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse-slow"></div>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Operational</p>
                </div>
                <p className="text-blue-100 text-sm mt-1">All systems running</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Insights */}
        {aiInsights && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50" data-testid="ai-insights-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl" style={{ fontFamily: 'Space Grotesk' }}>
                <TrendingUp className="w-6 h-6 text-purple-600" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>Advanced analytics powered by DeepSeek AI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {aiInsights}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mt-8 border-0 shadow-lg" data-testid="quick-actions-section">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 text-left justify-start" data-testid="view-all-users-btn">
                <Users className="w-5 h-5 mr-3 text-blue-600" />
                <div>
                  <p className="font-semibold">View All Users</p>
                  <p className="text-xs text-gray-500">Manage students & faculty</p>
                </div>
              </Button>
              <Button variant="outline" className="h-20 text-left justify-start" data-testid="generate-reports-btn">
                <BarChart3 className="w-5 h-5 mr-3 text-green-600" />
                <div>
                  <p className="font-semibold">Generate Reports</p>
                  <p className="text-xs text-gray-500">Export attendance data</p>
                </div>
              </Button>
              <Button variant="outline" className="h-20 text-left justify-start" data-testid="system-settings-btn">
                <TrendingUp className="w-5 h-5 mr-3 text-purple-600" />
                <div>
                  <p className="font-semibold">System Settings</p>
                  <p className="text-xs text-gray-500">Configure CampusTrack</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;