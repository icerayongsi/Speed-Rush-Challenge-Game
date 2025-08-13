import React, { useState, useEffect } from "react";
import DigitalCounter from "./DigitalCounter";
import { useTimer } from "../hooks/useTimer";
import { Play } from "lucide-react";
import "../styles/global.css";

const StandaloneGameScreen: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameDuration] = useState(15); // Fixed duration
  const [isWaiting, setIsWaiting] = useState(true);
  const [gameReady, setGameReady] = useState(false);
  const [showPushToStart, setShowPushToStart] = useState(false);
  const [waitingForClick, setWaitingForClick] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lowTimeWarning, setLowTimeWarning] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [gameOverTimer, setGameOverTimer] = useState(5);
  const tapDebounceTime = 100;
  
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    const finalScore = score;
    setGameOver(true);
  });

  useEffect(() => {
    const savedHighScore = localStorage.getItem('standaloneHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
  }, []);

  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && isActive) {
      setLowTimeWarning(true);
    } else {
      setLowTimeWarning(false);
    }
  }, [timeLeft, isActive]);

  useEffect(() => {
    if (gameOver) {

      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('standaloneHighScore', score.toString());
      }
      
      const timer = setInterval(() => {
        setGameOverTimer((prev) => {
          if (prev <= 1) {
            resetGame();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameOver, score, highScore]);

  const handleStartGame = () => {
    setIsWaiting(false);
    setShowPushToStart(true);
    setGameReady(true);
    
    setTimeout(() => {
      setShowPushToStart(false);
      setWaitingForClick(true);
    }, 2000);
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapTime < tapDebounceTime) return;
    
    setLastTapTime(now);
    
    if (waitingForClick) {
      setWaitingForClick(false);
      startTimer();
      return;
    }
    
    if (isActive) {
      setScore(prev => prev + 1);
      setTotalClicks(prev => prev + 1);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  const resetGame = () => {
    setIsTransitioning(true);
    
    setTimeout(() => {
      setScore(0);
      setTotalClicks(0);
      setGameOver(false);
      setIsWaiting(true);
      setGameReady(false);
      setShowPushToStart(false);
      setWaitingForClick(false);
      setGameOverTimer(5);
      setIsTransitioning(false);
    }, 500);
  };

  const getBackgroundClass = () => {
    if (gameOver) return "bg-waiting";
    if (isWaiting) return "bg-waiting";
    return "bg-game";
  };

  if (isWaiting) {
    return (
      <div className="w-full h-screen bg-cover bg-center bg-waiting flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="digital-font font-bold text-8xl text-white mb-12 neon-text">
            TAP Challenge
          </h1>
          
          <button
            onClick={handleStartGame}
            className="px-12 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white text-3xl font-bold rounded-lg transition-all flex items-center justify-center gap-4 mx-auto shadow-lg transform hover:scale-105"
          >
            <Play size={32} />
            START GAME
          </button>
          
          <div className="mt-8 text-white text-xl opacity-75">
            Game Duration: {gameDuration} seconds
          </div>
          
          {highScore > 0 && (
            <div className="mt-4 text-yellow-400 text-2xl font-bold">
              High Score: {highScore}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div
        className="w-full h-screen bg-cover bg-center game-transition"
        style={{ backgroundImage: `url('/game-over-background.jpg')` }}
      >
        <div className="pt-[670px] pr-[30px] simple-score-reveal">
          <DigitalCounter
            value={score}
            label=""
            size="large"
            CustomStyle="text-white font-bold"
          />
        </div>
        
        {/* Game Over Controls */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-white text-2xl font-bold mb-4">
            กลับไปหน้าเกมใน {gameOverTimer} วินาที
          </div>
          <div className="text-white text-lg opacity-75">
            หรือกดเพื่อกลับทันที
          </div>
          <button
            onClick={resetGame}
            className="mt-4 px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-lg transition-colors duration-200 shadow-lg"
          >
            กลับไปหน้าเกม
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full h-screen bg-cover bg-center bg-start transition-all duration-500 cursor-pointer ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleTap}
    >
      {showPushToStart && !gameReady ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 z-10">
          <div className="push-to-start-container appear">
            <h2 className="digital-font font-bold text-6xl text-white mb-8 neon-text pulse-text text-center pt-[30px]">
              PUSH TO START
            </h2>
          </div>
        </div>
      ) : null}

      {waitingForClick && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
          <h2 className="digital-font font-bold text-6xl text-white mb-8 neon-text pulse-text text-center">
            กดเพื่อเริ่มเกม!
          </h2>
          <div className="text-white text-2xl opacity-75 text-center">
            CLICK TO START GAME!
          </div>
        </div>
      )}

      <div className="w-full flex-1 flex flex-col items-center pt-[640px] pr-[45px]">
        <div className="mb-8 pl-[40px]">
          <DigitalCounter
            value={totalClicks + score}
            label=""
            size="total"
            CustomStyle="text-red-600 font-bold"
            animate={isAnimating}
          />
        </div>

        <div className="w-full flex justify-around px-24 mt-[35px] mr-6">
          <div className="text-center w-1/2 px-4 pr-[60px]">
            <DigitalCounter
              value={highScore}
              label=""
              size="medium"
              CustomStyle="text-white font-bold"
            />
          </div>
          <div className="text-center w-1/2 px-6">
            <div
              className={`digital-font font-bold text-8xl text-yellow-400 text-center px-6 py-3 pr-[95px] pt-[25px] rounded-xl ${
                lowTimeWarning ? "timer-warning" : ""
              }`}
            >
              {timeLeft.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[450px] pr-[20px] left-0 right-0 flex justify-center">
        <DigitalCounter
              value={score}
              label=""
              size="large"
              CustomStyle="text-white font-bold"
            />
      </div>

      <div className="w-full flex items-center px-4 pl-[300px] mt-[585px]">
        <span className="text-white text-6xl thai-font">-</span>
      </div>
    </div>
  );
};

export default StandaloneGameScreen;