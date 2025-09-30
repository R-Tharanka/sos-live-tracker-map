import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MapTracker from './components/MapTracker';
import Login from './components/Login';
import SessionAccess from './components/SessionAccess';
import NotFound from './components/NotFound';
import { AuthProvider } from './auth/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/access/:sessionId" element={<SessionAccess />} />
        
        {/* Make map accessible without authentication */}
        <Route path="/map/:sessionId" element={<MapTracker />} />
        
        {/* Direct session access with token */}
        <Route path="/session/:sessionId" element={<SessionAccess />} />
        
        {/* Fallback route */}
        <Route path="/" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;