import React, { useState, useEffect, useRef } from 'react';
import DigitalCounter from './DigitalCounter';
import { useTimer } from '../hooks/useTimer';
import { socket } from '../socket';
import { API_URL } from '../App';

const GameScreen: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [businessCard, setBusinessCard] = useState<string | null>(null);
  const [gameDuration, setGameDuration] = useState(+import.meta.env.VITE_GAME_DURATION);
  const [highScores, setHighScores] = useState<any[]>([]);
  const [isWaiting, setIsWaiting] = useState(true);
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    const finalScore = score;
    socket.emit('game_end', { score: finalScore });
    setGameOver(true);
  });

  const hasIdentified = useRef(false);

  useEffect(() => {
    if (!hasIdentified.current) {
      console.log('GameScreen mounted, identifying as game client');
      socket.emit('identify_client', { type: 'game' });
      hasIdentified.current = true;
    }
    
    return () => {
      socket.off('connect');
    };
  }, []);
  
  useEffect(() => {
    if (isActive) {
      socket.emit('game_time_sync', { timeLeft: parseFloat(timeLeft.toFixed(1)) });
    }
  }, [timeLeft, isActive]);

  useEffect(() => {
    socket.on('game_start', (data) => {
      if (gameOver) return;
      setPlayerName(data.playerName);
      setBusinessCard(data.businessCard || null);
      setGameDuration(data.gameDuration);
      setIsWaiting(false);
      startCountdown();
    });

    socket.on('game_results', (data) => {
      if (data.highScores) {
        setHighScores(data.highScores);
        if (data.highScores.length > 0) {
          setHighScore(data.highScores[0].score);
        }
      }
    });

    fetch(`${API_URL}/api/high-scores`)
      .then(response => response.json())
      .then(data => {
        setHighScores(data);
        if (data.length > 0) {
          setHighScore(data[0].score);
        }
      })
      .catch(error => console.error('Error fetching high scores:', error));

    return () => {
      socket.off('game_start');
      socket.off('game_results');
    };
  }, [gameOver]);

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
  
  if (gameOver) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-red-900 to-black">
        <div className="text-center p-8 bg-black/80 rounded-xl border-2 border-yellow-500 shadow-lg shadow-yellow-500/50">
          <h2 className="text-yellow-400 text-5xl mb-6 digital-font">GAME OVER</h2>
          
          <div className="mb-8">
            <h3 className="text-white text-2xl mb-2">Your Score</h3>
            <div className="text-red-500 text-7xl digital-font">{score}</div>
          </div>
          
          {highScore > 0 && (
            <div className="mb-8">
              <h3 className="text-white text-2xl mb-2">High Score</h3>
              <div className="text-yellow-400 text-5xl digital-font">{highScore}</div>
            </div>
          )}
          
          {/* High Scores List */}
          {highScores.length > 0 && (
            <div className="mt-8 mb-8">
              <h3 className="text-white text-2xl mb-4">Leaderboard</h3>
              <div className="max-h-60 overflow-y-auto">
                {highScores.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between mb-2 p-2 bg-black/50 rounded border border-yellow-500/30">
                    <div className="flex items-center">
                      <div className="mr-3 text-yellow-400 digital-font">{index + 1}.</div>
                      <div className="w-16 h-10 rounded-md overflow-hidden mr-2 bg-gray-800 flex-shrink-0">
                        {entry.business_card ? (
                          <img src={entry.business_card} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400">?</div>
                        )}
                      </div>
                      <div className="text-white text-left">{entry.name}</div>
                    </div>
                    <div className="text-red-400 digital-font">{entry.score}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-8">
            <p className="text-white text-xl">Waiting for next game...</p>
          </div>
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
      
      <div className="w-full flex-1 flex flex-col items-center pt-[630px]">
        {/* Timer display */}
        {/* <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-lg border border-red-500">
          <DigitalCounter 
            value={parseFloat(timeLeft.toFixed(1))}
            label="TIME"
            size="medium"
            fontColor="text-yellow-400"
          />
        </div> */}
        
        {/* Total clicks counter */}
        <div className="mb-8">
          <DigitalCounter 
            value={score}
            label=""
            size="large"
            CustomStyle="text-red-600 font-bold"
            animate={isAnimating}
          />
        </div>
        
        {/* Scores section */}
        <div className="w-full flex justify-around px-24 mt-[260px] mr-6">
          <div className="text-center w-1/2 px-4">
            <DigitalCounter 
              value={highScore}
              label=""
              size="medium"
              CustomStyle="text-white font-bold"
            />
          </div>
          <div className="text-center w-1/2 px-6">
            <DigitalCounter 
              value={score}
              label=""
              size="medium"
              CustomStyle="text-white font-bold"
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
      
      {/* Player info - Using layout from the background image */}
      <div className="w-full flex items-center px-4 pl-[350px] mt-[430px]">
        {/* {businessCard && (
          <div className="w-24 h-14 rounded-md overflow-hidden border-2 border-yellow-500 mr-4">
            <img src={businessCard} alt="Business Card" className="w-full h-full object-cover" />
          </div>
        )} */}
        <span className="text-white text-6xl">{playerName}</span>
      </div>
    </div>
  );
};

export default GameScreen;