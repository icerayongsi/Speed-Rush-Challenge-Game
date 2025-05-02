import React, { useEffect, useState } from 'react';
import { Trophy, RotateCcw, Play } from 'lucide-react';

interface ResultScreenProps {
  score: number;
  highScore: number;
  duration: number;
  playerName: string;
  onRestart: () => void;
  onPlayAgain: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({
  score,
  highScore,
  duration,
  playerName,
  onRestart,
  onPlayAgain
}) => {
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const clicksPerSecond = (score / duration).toFixed(2);
  
  useEffect(() => {
    if (score > 0 && score >= highScore) {
      setIsNewHighScore(true);
    }
  }, [score, highScore]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between py-8">
      <div className="mb-4 appear">
        <h2 className="text-white text-2xl font-bold text-center">Challenge Complete!</h2>
      </div>
      
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-6 w-11/12 max-w-xs appear">
          <div className="mb-6 text-center">
            <div className="text-white text-lg font-bold">
              {playerName}'s Results
            </div>
          </div>
          
          {isNewHighScore && (
            <div className="mb-4 text-center bg-gradient-to-r from-yellow-500 to-yellow-300 text-black py-2 rounded-md flex items-center justify-center font-bold appear">
              <Trophy size={20} className="mr-2" />
              NEW HIGH SCORE!
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900/80 p-3 rounded-md">
              <div className="text-gray-400 text-sm">Total Clicks</div>
              <div className="digital-font text-3xl text-white">{score}</div>
            </div>
            <div className="bg-gray-900/80 p-3 rounded-md">
              <div className="text-gray-400 text-sm">Clicks/Second</div>
              <div className="digital-font text-3xl text-white">{clicksPerSecond}</div>
            </div>
            <div className="bg-gray-900/80 p-3 rounded-md">
              <div className="text-gray-400 text-sm">Duration</div>
              <div className="digital-font text-3xl text-white">{duration}s</div>
            </div>
            <div className="bg-gray-900/80 p-3 rounded-md">
              <div className="text-gray-400 text-sm">High Score</div>
              <div className="digital-font text-3xl text-white">{highScore}</div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onRestart}
              className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-md hover:bg-gray-700 transition-all flex items-center justify-center"
            >
              <RotateCcw size={18} className="mr-2" />
              Setup
            </button>
            <button
              onClick={onPlayAgain}
              className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-md hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center neon-border"
            >
              <Play size={18} className="mr-2" />
              Again
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-white text-sm opacity-70 appear">
        Challenge your friends to beat your score!
      </div>
    </div>
  );
};

export default ResultScreen;