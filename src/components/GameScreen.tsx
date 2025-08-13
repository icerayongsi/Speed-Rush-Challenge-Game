import React, { useState, useEffect, useRef } from "react";
import DigitalCounter from "./DigitalCounter";
import { useTimer } from "../hooks/useTimer";
import { socket } from "../socket";
import { Settings, Save, MinusCircle, PlusCircle, X, CreditCard, Play, User } from "lucide-react";
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
  const [gameOverTimer, setGameOverTimer] = useState(5);
  // Removed showSettings state as settings are now always shown in waiting state
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newBusinessCard, setNewBusinessCard] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tapDebounceTime = 100;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { timeLeft, startTimer, isActive } = useTimer(gameDuration, () => {
    const finalScore = score;
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("businessCard", file);

    setIsUploading(true);

    try {
      const response = await fetch(`/api/upload-business-card`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {

        throw new Error("Invalid response format from server");
      }

      if (data.success) {
        setNewBusinessCard(data.filePath);
      } else {
        alert("Failed to upload image: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An error occurred while uploading. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleStartNewGame = async () => {
    if (!newPlayerName.trim() || !newBusinessCard) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPlayerName,
          businessCard: newBusinessCard,
          gameDuration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewPlayerName("");
        setNewBusinessCard(null);
        // The game will start automatically via socket events
      } else {
        console.error("Failed to start game:", data.error);
        alert("Failed to start game. Please try again.");
      }
    } catch (error) {
      console.error("Error starting game:", error);
      alert("An error occurred while starting the game. Please try again.");
    } finally {
      setIsSubmitting(false);
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
      if (gameOver && canContinue) {
        resetGame();
      } else if (showPushToStart && !gameReady) {
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
          if (gameOver && canContinue) {
            console.log("Tap registered");
            resetGame();
          } else if (showPushToStart && !gameReady) {
            startGame();
          } else if (isActive) {
            handleTap();
          }
        }
      }
      
      // Settings are now always visible in waiting state, no keyboard toggle needed
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      socket.off("connect");
      socket.off("button_press");
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameReady, isActive, showPushToStart, canContinue]);
  useEffect(() => {
    if (isActive) {
      socket.emit("game_time_sync", {
        timeLeft: parseFloat(timeLeft.toFixed(1)),
      });
    }
  }, [timeLeft, isActive]);

  useEffect(() => {
    const handleResetGame = (data : any) => {
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
    let countdownInterval: NodeJS.Timeout;
    
    if (gameOver) {
      setGameOverTimer(5);
      setCanContinue(false);
      
      countdownInterval = setInterval(() => {
        setGameOverTimer((prev) => {
          if (prev <= 1) {
            // Auto return to settings form after 5 seconds
            resetGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      continueTimer = setTimeout(() => {
        // Auto return to settings form after 5 seconds
        resetGame();
        setGameOverTimer(0);
      }, 5000);
    } else {
      setGameOverTimer(5);
      setCanContinue(false);
    }

    return () => {
      if (continueTimer) clearTimeout(continueTimer);
      if (countdownInterval) clearInterval(countdownInterval);
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
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center">
        {/* Full Screen Settings Form */}
        <div className="w-full max-w-2xl mx-auto p-8">
          <div className="bg-black/80 rounded-2xl p-8 backdrop-blur-sm border border-red-500/30 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2 digital-font">GAME SETTINGS</h1>
              <div className="w-24 h-1 bg-red-500 mx-auto rounded"></div>
            </div>
            
            <div className="space-y-8">
                {/* Player Setup Section */}
                <div className="border-b border-gray-700 pb-4">
                  <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
                    <User size={20} className="mr-2" />
                    Player Setup
                  </h3>
                  
                  {/* Business Card Upload */}
                  <div className="mb-4 flex flex-col items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {newBusinessCard && (
                      <div className="mb-3">
                        <img
                          src={newBusinessCard}
                          alt="Business Card Preview"
                          className="w-32 h-20 object-cover rounded border border-gray-700"
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={triggerFileInput}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        isUploading
                          ? "bg-gray-600 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500"
                      } text-white flex items-center gap-2`}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        "Uploading..."
                      ) : (
                        <>
                          <CreditCard size={16} />
                          {newBusinessCard ? "Change Business Card" : "Upload Business Card"}
                        </>
                      )}
                    </button>
                  </div>

                  {/* Player Name Input */}
                  <div className="mb-4">
                    <label className="block text-white text-sm mb-2">
                      Player Name:
                    </label>
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Enter player name"
                      className="w-full p-2 bg-gray-800 text-white border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      maxLength={50}
                    />
                  </div>

                  {/* Start Game Button */}
                  <button
                    onClick={handleStartNewGame}
                    disabled={!newPlayerName.trim() || !newBusinessCard || isSubmitting}
                    className={`w-full py-3 text-white font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                      newPlayerName.trim() && newBusinessCard && !isSubmitting
                        ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                        : "bg-gray-700 cursor-not-allowed"
                    }`}
                  >
                    <Play size={16} />
                    {isSubmitting ? "STARTING GAME..." : "START GAME"}
                  </button>
                </div>

                {/* Game Settings Section */}
                <div>
                  <h3 className="text-white text-lg font-semibold mb-4">Game Settings</h3>
                  
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
                  
                  <div className="flex justify-center">
                     <button
                       onClick={saveSettings}
                       disabled={isSavingSettings}
                       className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
                     >
                       <Save size={20} />
                       <span>{isSavingSettings ? "Saving..." : "Save Settings"}</span>
                     </button>
                   </div>
                 </div>
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