import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API, WS_URL } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LogOut, Plus, Users, PlayCircle, StopCircle, TrendingUp, BarChart3 } from 'lucide-react';

const FacultyDashboard = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [newSession, setNewSession] = useState({
    course_name: '',
    course_code: '',
    department: user.department || ''
  });
  const wsRef = useRef(null);

  useEffect(() => {
    fetchData();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket(`${WS_URL}/ws/${user.id}`);
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'attendance_marked') {
        fetchSessions();
        toast.success(`${data.student_name} marked attendance`);
      }
    };
    ws.onerror = (error) => console.error('WebSocket error:', error);
    wsRef.current = ws;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSessions(), fetchAnalytics()]);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    const response = await axios.get(`${API}/sessions`);
    setSessions(response.data);
  };

  const fetchAnalytics = async () => {
    const response = await axios.get(`${API}/analytics/overview`);
    setAnalytics(response.data);
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

  const createSession = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/sessions`, newSession);
      toast.success('Session created successfully!');
      setCreateDialogOpen(false);
      setNewSession({ course_name: '', course_code: '', department: user.department || '' });
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create session');
    }
  };

  const endSession = async (sessionId) => {
    try {
      await axios.post(`${API}/sessions/${sessionId}/end`);
      toast.success('Session ended successfully');
      await fetchData();
    } catch (error) {
      toast.error('Failed to end session');
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
                <p className="text-sm text-gray-600">Faculty Portal</p>
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
        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white" data-testid="total-sessions-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{analytics.total_sessions}</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white" data-testid="active-sessions-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Active Now</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{analytics.active_sessions}</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white" data-testid="completed-sessions-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{analytics.completed_sessions}</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white" data-testid="avg-attendance-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Avg Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{analytics.average_attendance_rate.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>Your Sessions</h2>
            <p className="text-gray-600 text-sm">Manage and monitor your classes</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={fetchAIInsights}
              disabled={loadingInsights}
              data-testid="ai-insights-btn"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {loadingInsights ? 'Loading...' : 'AI Insights'}
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" data-testid="create-session-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Space Grotesk' }}>Create New Session</DialogTitle>
                  <DialogDescription>Start a new attendance session for your class</DialogDescription>
                </DialogHeader>
                <form onSubmit={createSession} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-name">Course Name</Label>
                    <Input
                      id="course-name"
                      placeholder="Introduction to AI"
                      value={newSession.course_name}
                      onChange={(e) => setNewSession({...newSession, course_name: e.target.value})}
                      required
                      data-testid="course-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-code">Course Code</Label>
                    <Input
                      id="course-code"
                      placeholder="CS301"
                      value={newSession.course_code}
                      onChange={(e) => setNewSession({...newSession, course_code: e.target.value})}
                      required
                      data-testid="course-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="Computer Science"
                      value={newSession.department}
                      onChange={(e) => setNewSession({...newSession, department: e.target.value})}
                      required
                      data-testid="department-input"
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="submit-create-session-btn">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Session
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Insights */}
        {aiInsights && (
          <Card className="mb-8 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50" data-testid="ai-insights-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                <TrendingUp className="w-5 h-5 text-purple-600" />
                AI-Powered Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {aiInsights}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions List */}
        <Card className="border-0 shadow-lg" data-testid="sessions-list-section">
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-gray-500 text-center py-8">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <PlayCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No sessions yet</p>
                <p className="text-gray-500 text-sm mt-1">Create your first session to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50"
                    data-testid={`session-${session.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
                          {session.course_name}
                        </h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {session.course_code}
                        </Badge>
                        {session.is_active ? (
                          <Badge className="bg-green-100 text-green-700">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Ended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Started: {formatDateTime(session.start_time)}
                        {session.end_time && ` • Ended: ${formatDateTime(session.end_time)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 font-medium">
                          {session.present_count} students present
                        </span>
                      </div>
                    </div>
                    {session.is_active && (
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => endSession(session.id)}
                        data-testid={`end-session-btn-${session.id}`}
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        End Session
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FacultyDashboard;