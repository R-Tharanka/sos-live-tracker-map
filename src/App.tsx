import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MapTracker from './components/MapTracker';
import NotFound from './components/NotFound';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/session/:sessionId" element={<MapTracker />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;