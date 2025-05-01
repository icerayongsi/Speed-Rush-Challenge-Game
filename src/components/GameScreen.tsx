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
      
      <div className="w-full flex-1 flex flex-col items-center pt-[690px]">
        {/* Total clicks counter */}
        <div className="mb-8">
          <DigitalCounter 
            value={score}
            label=""
            size="large"
            fontColor="text-red-600"
            animate={isAnimating}
          />
        </div>
        
        {/* Scores section */}
        <div className="w-full flex justify-around px-24 mt-[400px]">
          <div className="text-center w-1/2 px-4">
            <DigitalCounter 
              value={highScore}
              label=""
              size="medium"
            />
          </div>
          <div className="text-center w-1/2 px-4">
            <DigitalCounter 
              value={score}
              label=""
              size="medium"
            />
          </div>
        </div>
      </div>
      
      {/* Timer */}
      <div className="absolute bottom-[240px] left-0 right-0 flex justify-center">
        <div className="digital-font text-8xl text-yellow-400 text-center px-6 py-3 rounded-xl neon-text">
          {timeLeft.toFixed(1)}
        </div>
      </div>
      
      {/* Player name - Using layout from the background image */}
      <div className="w-full text-white text-6xl px-4 pl-[350px] mt-[480px]">
        <span>{playerName}</span>
      </div>
    </div>
  );
};

export default GameScreen;