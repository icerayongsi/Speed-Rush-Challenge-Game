import React, { useState, useEffect, useRef } from "react";
import DigitalCounter from "./DigitalCounter";
import { useTimer } from "../hooks/useTimer";
import { socket } from "../socket";
import { API_URL } from "../App";
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
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lowTimeWarning, setLowTimeWarning] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    const finalScore = score;
    socket.emit("game_end", { score: finalScore });
    setIsTransitioning(true);
    setTimeout(() => {
      setGameOver(true);
      setIsTransitioning(false);
    }, 500);
  });

  const hasIdentified = useRef(false);

  useEffect(() => {
    if (!hasIdentified.current) {
      console.log("GameScreen mounted, identifying as game client");
      socket.emit("identify_client", { type: "game" });
      hasIdentified.current = true;
    }

    socket.on("button_press", () => {
      console.log("Button pressed");
      handleTap();
    });

    return () => {
      socket.off("connect");
      socket.off("button_press");
    };
  }, [countdownFinished, isActive, isTransitioning]);

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
      setIsTransitioning(true);
      setTimeout(() => {
        setIsWaiting(false);
        setIsTransitioning(false);
        startCountdown();
      }, 500);
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

    fetch(`${API_URL}/api/total-clicks`)
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
      gameOverTimer = setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setGameOver(false);
          setIsWaiting(true);
          setCountdownFinished(false);
          setCountdown(3);
          setScore(0);
          setIsTransitioning(false);
        }, 500);
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
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsTransitioning(true);
          setTimeout(() => {
            setCountdownFinished(true);
            setIsTransitioning(false);
            startTimer();
          }, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (countdownFinished && isActive && !isTransitioning) {
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

  if (isWaiting) {
    return (
      <div
        className={`w-full h-screen bg-cover bg-center state-transition ${
          isTransitioning ? "fade-out" : "fade-in"
        }`}
        style={{ backgroundImage: `url('/game-background.jpg')` }}
      >
        <div className="w-full px-24 pt-[620px] pl-[200px] pr-[240px] text-center">
          <DigitalCounter
            value={totalClicks + score}
            label=""
            size="large"
            CustomStyle="text-red-600 font-bold"
            animate={isAnimating}
          />
        </div>
        <div className="w-full flex justify-around px-24 mt-[60px] mr-6">
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
              className={`digital-font font-bold text-8xl text-yellow-400 text-center px-6 py-3 pr-[200px] pt-[25px] rounded-xl neon-text ${
                lowTimeWarning ? "timer-warning" : ""
              }`}
            >
              {timeLeft.toFixed(1)}
            </div>
          </div>
        </div>
        {/* <div className="text-white text-2xl text-center mt-24 appear">
          <h2 className="mb-4 neon-text pulse-text">
            Waiting for game to start...
          </h2>
        </div> */}
        {/* Timer */}
      </div>
    );
  }

  if (gameOver) {
    return (
      <div
        className={`w-full h-screen bg-cover bg-center state-transition game-over-animation ${
          isTransitioning ? "fade-out" : "fade-in"
        }`}
        style={{ backgroundImage: `url('/game-over-background.jpg')` }}
      >
        <div className="pt-[670px] pr-[30px] score-reveal">
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
      className={`w-full h-screen bg-cover bg-center state-transition ${
        isTransitioning ? "fade-out" : "fade-in"
      }`}
      style={{ backgroundImage: `url('/game-background.jpg')` }}
    >
      {!countdownFinished ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="countdown-number">
            <DigitalCounter
              value={countdown}
              label=""
              size="large"
              CustomStyle="text-white"
              animate={true}
            />
          </div>
        </div>
      ) : null}

      <div className="w-full flex-1 flex flex-col items-center pt-[620px] pr-[45px]">
        {/* Current game score counter */}
        <div className="mb-8">
          <DigitalCounter
            value={totalClicks + score}
            label=""
            size="large"
            CustomStyle="text-red-600 font-bold"
            animate={isAnimating}
          />
        </div>

        {/* Scores section */}
        <div className="w-full flex justify-around px-24 mt-[20px] mr-6">
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
              className={`digital-font font-bold text-8xl text-yellow-400 text-center px-6 py-3 pr-[95px] pt-[25px] rounded-xl neon-text ${
                lowTimeWarning ? "timer-warning" : ""
              }`}
            >
              {timeLeft.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="absolute bottom-[450px] pr-[20px] left-0 right-0 flex justify-center">
        <DigitalCounter
              value={score}
              label=""
              size="large"
              CustomStyle="text-white font-bold"
            />
      </div>

      {/* Player info */}
      <div className="w-full flex items-center px-4 pl-[300px] mt-[590px]">
        <span className="text-white text-6xl thai-font">{playerName}</span>
      </div>
    </div>
  );
};

export default GameScreen;
