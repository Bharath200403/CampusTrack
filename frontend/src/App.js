import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Login from '@/pages/Login';
import StudentDashboard from '@/pages/StudentDashboard';
import FacultyDashboard from '@/pages/FacultyDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl font-medium text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/dashboard" 
            element={
              user ? (
                user.role === 'student' ? (
                  <StudentDashboard user={user} onLogout={handleLogout} />
                ) : user.role === 'faculty' ? (
                  <FacultyDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                )
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
};

export default App;