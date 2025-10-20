import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API, WS_URL } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { LogOut, Camera, CheckCircle, Clock, Calendar, TrendingUp } from 'lucide-react';

const StudentDashboard = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);
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
      if (data.type === 'session_created') {
        fetchSessions();
        toast.info('New session available!');
      }
    };
    ws.onerror = (error) => console.error('WebSocket error:', error);
    wsRef.current = ws;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSessions(), fetchAttendanceHistory(), fetchAnalytics()]);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    const response = await axios.get(`${API}/sessions?active_only=true`);
    setSessions(response.data);
  };

  const fetchAttendanceHistory = async () => {
    const response = await axios.get(`${API}/attendance/my-history`);
    setAttendanceHistory(response.data);
  };

  const fetchAnalytics = async () => {
    const response = await axios.get(`${API}/analytics/overview`);
    setAnalytics(response.data);
  };

  const markAttendance = async (sessionId) => {
    setMarkingAttendance(true);
    try {
      // Simulate face recognition UI
      toast.info('Please look at the camera...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await axios.post(`${API}/attendance`, {
        session_id: sessionId,
        verification_method: 'face'
      });
      
      toast.success(`Attendance marked! Confidence: ${(response.data.confidence_score * 100).toFixed(0)}%`);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setMarkingAttendance(false);
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
                <p className="text-sm text-gray-600">Student Portal</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white" data-testid="total-sessions-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Total Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{analytics.total_sessions}</p>
                <p className="text-blue-100 text-sm mt-1">In your department</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white" data-testid="attended-sessions-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Attended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{analytics.attended_sessions}</p>
                <p className="text-green-100 text-sm mt-1">Sessions completed</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white" data-testid="attendance-rate-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{analytics.attendance_rate}%</p>
                <Progress value={analytics.attendance_rate} className="mt-2 h-2 bg-indigo-300" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Sessions */}
        <Card className="mb-8 border-0 shadow-lg" data-testid="active-sessions-section">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Active Sessions</CardTitle>
            <CardDescription>Mark your attendance for ongoing classes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500 text-center py-8">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No active sessions</p>
                <p className="text-gray-500 text-sm mt-1">Check back when classes start</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const isAttended = attendanceHistory.some(a => a.session_id === session.id);
                  return (
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
                          {isAttended && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Marked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Faculty: {session.faculty_name} • Started: {formatDateTime(session.start_time)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Present: {session.present_count} students
                        </p>
                      </div>
                      <Button
                        onClick={() => markAttendance(session.id)}
                        disabled={markingAttendance || isAttended}
                        className={isAttended 
                          ? "bg-green-500 hover:bg-green-600" 
                          : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        }
                        data-testid={`mark-attendance-btn-${session.id}`}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {isAttended ? 'Marked' : markingAttendance ? 'Marking...' : 'Mark Attendance'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card className="border-0 shadow-lg" data-testid="attendance-history-section">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Attendance History</CardTitle>
            <CardDescription>Your recent attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No attendance records yet</p>
            ) : (
              <div className="space-y-3">
                {attendanceHistory.slice(0, 10).map((record) => (
                  <div 
                    key={record.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                    data-testid={`attendance-record-${record.id}`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{record.course_code}</p>
                      <p className="text-sm text-gray-600">{formatDateTime(record.marked_at)}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="border-green-500 text-green-700">
                        {(record.confidence_score * 100).toFixed(0)}% confidence
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{record.verification_method}</p>
                    </div>
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

export default StudentDashboard;