import React, { useState, useEffect } from 'react';
import DigitalCounter from './DigitalCounter';
import { useTimer } from '../hooks/useTimer';
import { socket } from '../socket';

const GameScreen: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [gameDuration, setGameDuration] = useState(15);
  const [isWaiting, setIsWaiting] = useState(true);
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    socket.emit('game_end', { score });
  });

  useEffect(() => {
    socket.on('game_start', (data) => {
      setPlayerName(data.playerName);
      setGameDuration(data.gameDuration);
      setIsWaiting(false);
      startCountdown();
    });

    return () => {
      socket.off('game_start');
    };
  }, []);

  const startCountdown = () => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setCountdownFinished(true);
          startTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (!countdownFinished || !isActive) return;
    
    setScore(prev => prev + 1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 100);
  };

  if (isWaiting) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-red-900 to-black">
        <div className="text-white text-2xl text-center">
          <h2 className="mb-4">Waiting for game to start...</h2>
          <p className="text-lg opacity-70">Control the game from another device</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('/game-background.jpg')` }}
      onClick={handleTap}
    >
      {!countdownFinished ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="digital-font text-7xl text-white countdown-animation">
            {countdown}
          </div>
        </div>
      ) : null}
      
      <div className="w-full h-full flex flex-col items-center pt-32">
        <div className="mt-20 mb-4">
          <DigitalCounter 
            value={score}
            label="CLICKS"
            size="large"
            animate={isAnimating}
          />
        </div>
        
        <div className="w-full flex justify-around mt-8">
          <div className="text-center">
            <DigitalCounter 
              value={highScore}
              label="HIGH SCORE"
              size="medium"
            />
          </div>
          <div className="text-center">
            <DigitalCounter 
              value={score}
              label="YOUR SCORE"
              size="medium"
            />
          </div>
        </div>
        
        <div className="mt-auto mb-10">
          <div className="digital-font text-5xl text-yellow-300 text-center px-4 py-2">
            {timeLeft.toFixed(1)}s
          </div>
        </div>
        
        <div className="mb-6 w-full text-white text-xl px-4">
          PLAYER: <span className="font-bold">{playerName}</span>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;