import React, { useState, useEffect, useRef } from "react";
import DigitalCounter from "./DigitalCounter";
import { useTimer } from "../hooks/useTimer";
import { socket } from "../socket";
import { Settings, Save, MinusCircle, PlusCircle, X } from "lucide-react";
import "../styles/global.css";

const GameScreen: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [businessCard, setBusinessCard] = useState<string | null>(null);
  const [gameDuration, setGameDuration] = useState(15);
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
  const [lastTapTime, setLastTapTime] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const tapDebounceTime = 100;
  
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    const finalScore = score;
    // Emit game_over instead of game_end to keep status as in-game
    socket.emit("game_over", { score: finalScore });
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
      
      if (settings.gameDuration !== undefined) {
        setGameDuration(settings.gameDuration);
      }
      
      if (settings.fakeScore !== undefined) {
        setFakeScore(settings.fakeScore);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch(`/api/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameDuration,
          fakeScore,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        alert("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSavingSettings(false);
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
      if (event.key.toLowerCase() === 'a' && !event.repeat) {
        const now = Date.now();
        if (now - lastTapTime >= tapDebounceTime) {
          setLastTapTime(now);
          if (showPushToStart && !gameReady) {
            startGame();
          } else if (isActive) {
            handleTap();
          }
        }
      }
      
      // Toggle settings with 'S' key when waiting
      if (event.key.toLowerCase() === 's' && isWaiting && !event.repeat) {
        setShowSettings(!showSettings);
      }
      
      // Close settings with Escape key
      if (event.key === 'Escape' && showSettings) {
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      socket.off("connect");
      socket.off("button_press");
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameReady, isActive, showPushToStart,]);
  useEffect(() => {
    if (isActive) {
      socket.emit("game_time_sync", {
        timeLeft: parseFloat(timeLeft.toFixed(1)),
      });
    }
  }, [timeLeft, isActive]);

  useEffect(() => {
    const handleResetGame = (data: any) => {
      console.log("[Game] Received reset_game event:", data);
      console.log("[Game] Socket connected:", socket.connected);
      console.log("[Game] Socket id:", socket.id);
      resetGame();
    };

    console.log("[Game] Setting up reset_game listener");
    socket.on("reset_game", handleResetGame);

    socket.on("game_start", (data) => {
      if (gameOver) return;
      setPlayerName(data.playerName);
      setBusinessCard(data.businessCard || null);
      setGameDuration(data.gameDuration);
      
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
      console.log("[Game] Cleaning up socket listeners");
      socket.off("game_start");
      socket.off("game_results");
      socket.off("reset_game", handleResetGame);
    };
  }, [gameOver]);

  const resetGame = () => {
    socket.emit("game_complete");
    
    setGameOver(false);
    setIsWaiting(true);
    setGameReady(false);
    setShowPushToStart(false);
    setScore(0);
    setLowTimeWarning(false);
    setIsTransitioning(true);
    setCanContinue(false);
    setTimeout(() => setIsTransitioning(false), 100);
  };

  useEffect(() => {
    let continueTimer: NodeJS.Timeout;
    
    if (gameOver) {
      continueTimer = setTimeout(() => {
        setCanContinue(true);
      }, 2000);
    }

    return () => {
      if (continueTimer) clearTimeout(continueTimer);
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
        {/* Settings Button */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-md transition-colors backdrop-blur-sm"
            title="Game Settings"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setShowSettings(false)}
            />
            <div className="absolute top-20 right-4 w-96 bg-black/90 rounded-xl p-6 z-40 backdrop-blur-sm border border-red-900/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-xl font-bold">Game Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex flex-col space-y-4">
                 <div className="flex items-center justify-between mb-4">
                   <label className="text-white">Game Duration (seconds):</label>
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={() => setGameDuration(Math.max(5, gameDuration - 5))}
                       className="text-white hover:text-red-400 transition-colors"
                       title="Decrease duration"
                     >
                       <MinusCircle size={20} />
                     </button>
                    
                     <input
                       type="number"
                       min="5"
                       max="60"
                       value={gameDuration}
                       onChange={(e) => setGameDuration(Math.max(5, Math.min(60, parseInt(e.target.value) || 15)))}
                       className="w-16 p-1 bg-gray-800 text-white border border-gray-700 rounded text-center"
                     />
                    
                     <button
                       onClick={() => setGameDuration(Math.min(60, gameDuration + 5))}
                       className="text-white hover:text-red-400 transition-colors"
                       title="Increase duration"
                     >
                       <PlusCircle size={20} />
                     </button>
                   </div>
                 </div>
              
                <div className="flex items-center justify-between mb-4">
                  <label className="text-white">Fake Score (added to Total):</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setFakeScore(Math.max(0, fakeScore - 1000))}
                      className="text-white hover:text-red-400 transition-colors"
                      title="Decrease fake score"
                    >
                      <MinusCircle size={20} />
                    </button>
                    
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={fakeScore}
                      onChange={(e) => setFakeScore(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 p-1 bg-gray-800 text-white border border-gray-700 rounded text-center"
                    />
                    
                    <button
                      onClick={() => setFakeScore(fakeScore + 1000)}
                      className="text-white hover:text-red-400 transition-colors"
                      title="Increase fake score"
                    >
                      <PlusCircle size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={saveSettings}
                    disabled={isSavingSettings}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors"
                  >
                    <Save size={16} />
                    <span>{isSavingSettings ? "Saving..." : "Save Settings"}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="w-full px-24 pt-[640px] pl-[250px] pr-[240px] text-center">
          <DigitalCounter
            value={totalClicks + fakeScore}
            label=""
            size="total"
            CustomStyle="text-red-600 font-bold"
            animate={isAnimating}
          />
        </div>
        <div className="w-full flex justify-around px-24 mt-[75px] mr-6">
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
              {gameDuration.toFixed(1)}
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
            value={totalClicks + score + fakeScore}
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
        <span className="text-white text-6xl thai-font">{playerName}</span>
      </div>
    </div>
  );
};

export default GameScreen;