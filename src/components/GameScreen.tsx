import React, { useState, useEffect, useRef } from "react";
import DigitalCounter from "./DigitalCounter";
import { useTimer } from "../hooks/useTimer";
import { socket } from "../socket";
import { API_URL } from "../App";

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
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    const finalScore = score;
    socket.emit("game_end", { score: finalScore });
    setGameOver(true);
  });

  const hasIdentified = useRef(false);

  useEffect(() => {
    if (!hasIdentified.current) {
      console.log("GameScreen mounted, identifying as game client");
      socket.emit("identify_client", { type: "game" });
      hasIdentified.current = true;
    }

    return () => {
      socket.off("connect");
    };
  }, []);

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
      setIsWaiting(false);
      startCountdown();
    });

    socket.on("game_results", (data) => {
      if (data.highScores) {
        setHighScores(data.highScores);
        if (data.highScores.length > 0) {
          setHighScore(data.highScores[0].score);
        }
      }
    });

    fetch(`${API_URL}/api/high-scores`)
      .then((response) => response.json())
      .then((data) => {
        setHighScores(data);
        if (data.length > 0) {
          setHighScore(data[0].score);
        }
      })
      .catch((error) => console.error("Error fetching high scores:", error));

    return () => {
      socket.off("game_start");
      socket.off("game_results");
    };
  }, [gameOver]);

  useEffect(() => {
    let gameOverTimer: NodeJS.Timeout;
    
    if (gameOver) {
      gameOverTimer = setTimeout(() => {
        setGameOver(false);
        setIsWaiting(true);
        setCountdownFinished(false);
        setCountdown(3);
        setScore(0);
      }, +import.meta.env.VITE_GAME_OVER_DELAY * 1000);
    }
    
    return () => {
      if (gameOverTimer) {
        clearTimeout(gameOverTimer);
      }
    };
  }, [gameOver]);

  const startCountdown = () => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        console.log("Countdown tick:", prev);
        if (prev < 1) {
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

    setScore((prev) => prev + 1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 100);
  };

  if (isWaiting) {
    return (
      <div
        className="w-full h-screen bg-cover bg-center"
        style={{ backgroundImage: `url('/game-background.jpg')` }}
      >
        <div className="w-full flex px-24 pt-[1170px] pl-[186px]">
          <DigitalCounter
            value={highScore}
            label=""
            size="medium"
            CustomStyle="text-white font-bold"
          />
        </div>
        <div className="text-white text-2xl text-center mt-24">
          <h2 className="mb-4">Waiting for game to start...</h2>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div
        className="w-full h-screen bg-cover bg-center"
        style={{ backgroundImage: `url('/game-over-background.jpg')` }}
      >
        <div className="pt-[670px] pr-[30px]">
          <DigitalCounter
            value={highScore}
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
      className="w-full h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('/game-background.jpg')` }}
      onClick={handleTap}
    >
      {!countdownFinished ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="countdown-animation">
            <DigitalCounter 
              value={countdown} 
              label="" 
              size="medium" 
              CustomStyle="text-white" 
              animate={true} 
            />
          </div>
        </div>
      ) : null}

      <div className="w-full flex-1 flex flex-col items-center pt-[630px]">
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

      {/* Player info */}
      <div className="w-full flex items-center px-4 pl-[350px] mt-[430px]">
        <span className="text-white text-6xl">{playerName}</span>
      </div>
    </div>
  );
};

export default GameScreen;
