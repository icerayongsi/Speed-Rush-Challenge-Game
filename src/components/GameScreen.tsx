import React, { useState, useEffect, useRef } from "react";
import DigitalCounter from "./DigitalCounter";
import { useTimer } from "../hooks/useTimer";
import { socket } from "../socket";
import "../styles/global.css";

const GameScreen: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [businessCard, setBusinessCard] = useState<string | null>(null);
  const [gameDuration, setGameDuration] = useState(
    +import.meta.env.VITE_GAME_DURATION
  );
  const [highScores, setHighScores] = useState<any[]>([]);
  const [isWaiting, setIsWaiting] = useState(true);
  const [gameReady, setGameReady] = useState(false);
  const [showPushToStart, setShowPushToStart] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lowTimeWarning, setLowTimeWarning] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [fakeScore, setFakeScore] = useState(0);
  
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    const finalScore = score;
    socket.emit("game_end", { score: finalScore });
    
    setGameOver(true);
  });

  const hasIdentified = useRef(false);
  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/settings`);
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const settings = await response.json();
      if (settings.gameDuration) {
        setGameDuration(settings.gameDuration);
      }
      if (settings.fakeScore !== undefined) {
        setFakeScore(settings.fakeScore);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  useEffect(() => {
    fetchSettings();
    
    if (!hasIdentified.current) {
      console.log("GameScreen mounted, identifying as game client");
      socket.emit("identify_client", { type: "game" });
      hasIdentified.current = true;
    }

    socket.on("button_press", () => {
      if (showPushToStart && !gameReady) {
        startGame();
      } else {
        handleTap();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'g' || event.key === 'G') {
        if (showPushToStart && !gameReady) {
          startGame();
        } else {
          handleTap();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      socket.off("connect");
      socket.off("button_press");
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameReady, isActive, showPushToStart]);
  useEffect(() => {
    if (isActive) {
      socket.emit("game_time_sync", {
        timeLeft: parseFloat(timeLeft.toFixed(1)),
      });
    }
  }, [timeLeft, isActive]);

  useEffect(() => {
    socket.on("game_start", (data) => {
      if (gameOver) return;
      setPlayerName(data.playerName);
      setBusinessCard(data.businessCard || null);
      setGameDuration(data.gameDuration);
      
      // Always instant for game start (no transition)
      setIsWaiting(false);
      setShowPushToStart(true);
    });

    socket.on("game_results", (data) => {
      if (data.highScores) {
        setHighScores(data.highScores);
        if (data.highScores.length > 0) {
          setHighScore(data.highScores[0].score);
        }
      }
    });

    fetch(`/api/high-scores`)
      .then((response) => response.json())
      .then((data) => {
        const highestScore = Math.max(...data.data.map((item : {score: number}) => item.score));
        if (data.data.length > 0) {
          setHighScore(highestScore);
        }
      })
      .catch((error) => console.error("Error fetching high scores:", error));

    fetch(`/api/total-clicks`)
      .then((response) => response.json())
      .then((data) => {
        setTotalClicks(data.totalClicks);
      })
      .catch((error) => console.error("Error fetching total clicks:", error));

    return () => {
      socket.off("game_start");
      socket.off("game_results");
    };
  }, [gameOver]);

  useEffect(() => {
    let gameOverTimer: NodeJS.Timeout;

    if (gameOver) {
      setIsTransitioning(true);
      
      gameOverTimer = setTimeout(() => {
        setGameOver(false);
        setIsWaiting(true);
        setGameReady(false);
        setShowPushToStart(false);
        setScore(0);
        setLowTimeWarning(false);
        
        setTimeout(() => setIsTransitioning(false), 100);
      }, +import.meta.env.VITE_GAME_OVER_DELAY * 1000);
    }

    return () => {
      if (gameOverTimer) {
        clearTimeout(gameOverTimer);
      }
    };
  }, [gameOver]);
  const startGame = () => {
    console.log("Starting game...");
    
    // Always instant for game start (no transition)
    setShowPushToStart(false);
    setGameReady(true);
    startTimer();
  };

  const handleTap = () => {
    if (gameReady && isActive && !isTransitioning) {
      setScore((prev) => prev + 1);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 100);
    }
  };

  useEffect(() => {
    if (isActive && timeLeft <= 5 && !lowTimeWarning) {
      setLowTimeWarning(true);
    } else if ((!isActive || timeLeft > 5) && lowTimeWarning) {
      setLowTimeWarning(false);
    }
  }, [timeLeft, isActive, lowTimeWarning]);

  const getBackgroundClass = () => {
    if (gameOver) return 'bg-game-over';
    if (isWaiting) return 'bg-waiting';
    if (!gameReady) return 'bg-start';
    return 'bg-playing';
  };
  
  if (isWaiting) {
    return (
      <div
        className={`w-full h-screen bg-cover bg-center ${isTransitioning ? 'opacity-0' : 'opacity-100 game-transition'}`}
        style={{ backgroundImage: `url('/game-background.jpg')` }}
      >
        <div className="w-full px-24 pt-[640px] pl-[250px] pr-[240px] text-center">
          <DigitalCounter
            value={totalClicks + score + fakeScore}
            label=""
            size="total"
            CustomStyle="text-red-600 font-bold"
            animate={isAnimating}
          />
        </div>
        <div className="w-full flex justify-around px-24 mt-[85px] mr-6">
          <div className="text-center w-1/2 px-4 pr-[100px]">
            <DigitalCounter
              value={highScore}
              label=""
              size="medium"
              CustomStyle="text-white font-bold"
            />
          </div>
          <div className="text-center w-1/2 px-6">
            <div
              className={`digital-font font-bold text-8xl text-yellow-400 text-center px-6 py-3 pr-[200px] pt-[25px] rounded-xl ${
                lowTimeWarning ? "timer-warning" : ""
              }`}
            >
              {timeLeft.toFixed(1)}
            </div>
          </div>
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
      </div>
    );
  }

  return (
    <div 
      className={`w-full h-screen bg-cover bg-center transition-all duration-500 ${getBackgroundClass()} ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
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

      <div className="w-full flex-1 flex flex-col items-center pt-[640px] pr-[45px]">
        <div className="mb-8 pl-[40px]">
          <DigitalCounter
            value={totalClicks + fakeScore}
            label=""
            size="total"
            CustomStyle="text-red-600 font-bold"
            animate={isAnimating}
          />
        </div>

        <div className="w-full flex justify-around px-24 mt-[45px] mr-6">
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

      <div className="w-full flex items-center px-4 pl-[300px] mt-[595px]">
        <span className="text-white text-6xl thai-font">{playerName}</span>
      </div>
    </div>
  );
};

export default GameScreen;