import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ControlScreen from './components/ControlScreen';
import GameScreen from './components/GameScreen';
import StandaloneGameScreen from './components/StandaloneGameScreen';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/game" replace />} />
        <Route path="/control" element={<ControlScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/standalone" element={<StandaloneGameScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;