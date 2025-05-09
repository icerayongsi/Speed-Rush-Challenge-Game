import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ControlScreen from './components/ControlScreen';
import GameScreen from './components/GameScreen';
import './styles/global.css';

export const API_URL = `${import.meta.env.VITE_SERVER_HOST}:${import.meta.env.VITE_SERVER_PORT}`;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ControlScreen />} />
        <Route path="/game" element={<GameScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;