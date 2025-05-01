import React, { useState } from 'react';
import { Timer, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const ControlScreen: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [gameDuration, setGameDuration] = useState(15);
  const navigate = useNavigate();

  const handleStartGame = () => {
    socket.emit('start_game', { playerName, gameDuration });
    navigate('/game');
  };

  return (
    <div className="w-full h-screen flex flex-col justify-between items-center bg-gradient-to-b from-red-900 to-black p-8">
      <div className="mt-32 w-full flex flex-col items-center">
        <h1 className="text-4xl font-bold text-white mb-8 game-title">Speed Rush Challenge</h1>
      </div>
      
      <div className="w-full max-w-xs bg-black/70 rounded-xl p-6 backdrop-blur-sm appear">
        <h2 className="text-white text-xl font-bold mb-4 text-center">Game Setup</h2>
        
        <div className="mb-4">
          <label htmlFor="playerName" className="block text-white text-sm mb-1">
            Player Name:
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter player name"
            className="w-full p-2 bg-gray-800 text-white border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            maxLength={15}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-white text-sm mb-1">
            Game Duration:
          </label>
          <div className="flex justify-between gap-2">
            {[10, 15, 30].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setGameDuration(seconds)}
                className={`flex-1 py-2 px-3 rounded flex items-center justify-center ${
                  gameDuration === seconds
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Timer size={16} className="mr-1" />
                {seconds}s
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleStartGame}
          disabled={!playerName.trim()}
          className={`w-full py-3 text-white font-bold rounded-md transition-all ${
            playerName.trim()
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:transform active:scale-95 neon-border'
              : 'bg-gray-700 cursor-not-allowed'
          }`}
        >
          START CHALLENGE
        </button>
      </div>
      
      <div className="text-white text-sm mb-4 opacity-70">
        Open the game screen on another device and control from here
      </div>
    </div>
  );
};

export default ControlScreen;