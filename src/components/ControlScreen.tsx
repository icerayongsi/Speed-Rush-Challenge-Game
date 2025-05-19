import React, { useState, useRef, useEffect } from "react";
import {
  Timer,
  Trophy,
  User,
  Wifi,
  WifiOff,
  Gamepad2,
  CreditCard,
  Play,
  Trash2,
} from "lucide-react";
import { socket } from "../socket";
import { API_URL } from "../App";

const packageVersion = "1.0.38";

const ControlScreen: React.FC = () => {
  const [playerName, setPlayerName] = useState("");
  const [gameDuration, setGameDuration] = useState(15);
  const [businessCard, setBusinessCard] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameStatus, setGameStatus] = useState<"offline" | "idle" | "in-game">(
    "offline"
  );
  const [activePlayerName, setActivePlayerName] = useState("");
  const [activeTimer, setActiveTimer] = useState(0);
  const [gameClientsConnected, setGameClientsConnected] = useState(0);
  const [playerQueue, setPlayerQueue] = useState<
    { name: string; businessCard: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("businessCard", file);

    setIsUploading(true);

    try {
      console.log("Uploading file:", file.name, file.size, "bytes");

      const response = await fetch(`${API_URL}/api/upload-business-card`, {
        method: "POST",
        body: formData,
      });

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("Invalid response format from server");
      }

      if (data.success) {
        console.log("Upload successful, file path:", data.filePath);
        setBusinessCard(data.filePath);
      } else {
        console.error("Upload failed:", data.error);
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

  useEffect(() => {
    if (socket.connected) {
      socket.emit("request_game_client_count");
    }

    socket.on("connect", () => {
      socket.emit("request_game_client_count");
    });

    socket.on("disconnect", () => {
      setGameStatus("offline");
    });

    socket.on("game_start", (data) => {
      console.log("Game started:", data);
      setGameStatus("in-game");
      setActivePlayerName(data.playerName);
      setActiveTimer(data.gameDuration);
    });

    socket.on("game_end", () => {
      setActivePlayerName("");
      setActiveTimer(0);

      const gameOverDelay = +(import.meta.env.VITE_GAME_OVER_DELAY || 5) * 1000;
      setTimeout(() => {
        if (gameClientsConnected > 0) {
          setGameStatus("idle");
        } else {
          setGameStatus("offline");
        }
      }, gameOverDelay);
    });

    socket.on("game_client_count", (data) => {
      setGameClientsConnected(data.count);

      if (data.count > 0 && gameStatus !== "in-game") {
        setGameStatus("idle");
      } else if (data.count === 0 && gameStatus !== "in-game") {
        setGameStatus("offline");
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("game_start");
      socket.off("game_end");
      socket.off("game_client_count");
    };
  }, [gameStatus, gameClientsConnected]);

  useEffect(() => {
    socket.on("game_time_sync", (data) => {
      if (data.timeLeft !== undefined) {
        setActiveTimer(data.timeLeft);
      }
    });

    return () => {
      socket.off("game_time_sync");
    };
  }, []);

  const handleAddToQueue = () => {
    if (!playerName.trim() || !businessCard) return;

    setPlayerQueue([...playerQueue, { name: playerName, businessCard }]);

    setPlayerName("");
    setBusinessCard(null);
  };

  const handleDeleteFromQueue = (index: number) => {
    const updatedQueue = [...playerQueue];
    updatedQueue.splice(index, 1);
    setPlayerQueue(updatedQueue);
  };

  const handleStartGame = async (
    name: string,
    businessCard: string,
    index: number
  ) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          businessCard,
          gameDuration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGameStatus("in-game");
        setActivePlayerName(name);
        setActiveTimer(gameDuration);

        const updatedQueue = [...playerQueue];
        updatedQueue.splice(index, 1);
        setPlayerQueue(updatedQueue);
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

  return (
    <div className="w-full min-h-screen flex flex-col justify-between items-center bg-gradient-to-b from-red-900 to-black p-8 pb-16">
      <div className="mt-32 w-full flex flex-col items-center">
        <h1 className="text-4xl font-bold text-white mb-8 game-title">
          Speed Rush Challenge Control
        </h1>
      </div>
      <div className="flex flex-col">
        <div className="flex flex-col md:flex-row">
          <div className="flex flex-col space-y-4 md:mr-4">
            {/* Game Status */}
            <div>
              {gameStatus === "offline" && (
                <div className="w-full bg-red-950/60 border border-red-900/50 rounded-xl p-4 backdrop-blur-sm appear">
                  <h2 className="text-white text-sm text-center mb-2">
                    Game Status
                  </h2>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center mb-1">
                      <WifiOff size={18} className="text-red-500 mr-2" />
                      <h2 className="text-red-500 text-xl font-bold">
                        Offline
                      </h2>
                    </div>
                    <p className="text-gray-400 text-xs text-center">
                      No game screen open
                    </p>
                  </div>
                </div>
              )}

              {gameStatus === "idle" && (
                <div className="w-full bg-green-950/60 border border-green-900/50 rounded-xl p-4 backdrop-blur-sm appear">
                  <h2 className="text-white text-sm text-center mb-2">
                    Game Status
                  </h2>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center mb-1">
                      <Wifi size={18} className="text-green-500 mr-2" />
                      <h2 className="text-green-500 text-xl font-bold">Idle</h2>
                    </div>
                    <p className="text-gray-400 text-xs text-center">
                      Ready to play
                    </p>
                  </div>
                </div>
              )}

              {gameStatus === "in-game" && (
                <div className="w-full bg-yellow-950/60 border border-yellow-900/50 rounded-xl p-4 backdrop-blur-sm appear">
                  <h2 className="text-white text-sm text-center mb-2">
                    Game Status
                  </h2>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center mb-1">
                      <Gamepad2 size={18} className="text-yellow-500 mr-2" />
                      <h2 className="text-yellow-500 text-xl font-bold">
                        In Game
                      </h2>
                    </div>
                    <div className="flex items-center justify-between w-full mt-2">
                      <div className="flex items-center">
                        <User size={14} className="text-gray-400 mr-1" />
                        <p className="text-white text-sm">{activePlayerName}</p>
                      </div>
                      <div className="flex items-center">
                        <Timer size={14} className="text-gray-400 mr-1" />
                        <p className="text-white text-sm digital-font">
                          {activeTimer.toFixed(1)}s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="relative mt-2">
              <div className="w-full bg-black/70 rounded-xl p-6 appear">
                <h2 className="text-white text-xl font-bold mb-4 text-center">
                  Game Setup
                </h2>

                {/* Business Card Upload */}
                <div className="mb-6 flex flex-col items-center">
                  <div
                    className={`w-48 h-28 rounded-lg bg-gray-800 border-2 ${
                      businessCard ? "border-green-500" : "border-red-500"
                    } flex items-center justify-center overflow-hidden mb-2 cursor-pointer hover:opacity-90 transition-opacity`}
                    onClick={triggerFileInput}
                  >
                    {businessCard ? (
                      <img
                        ref={imageRef}
                        src={businessCard}
                        alt="Business Card"
                        className="w-full h-auto"
                      />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center justify-center">
                        <CreditCard size={32} />
                        <span className="text-xs mt-1">Add Business Card</span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    onClick={triggerFileInput}
                    className={`text-xs ${
                      businessCard
                        ? "text-green-400 hover:text-green-300"
                        : "text-red-400 hover:text-red-300"
                    } flex items-center gap-1`}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      "Uploading..."
                    ) : (
                      <>
                        <CreditCard size={12} />
                        {businessCard
                          ? "Change Business Card"
                          : "Upload Business Card"}
                      </>
                    )}
                  </button>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="playerName"
                    className="block text-white text-sm mb-1"
                  >
                    Player Name:
                  </label>
                  <input
                    id="playerName"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    className="w-full p-2 bg-gray-800 text-white border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    maxLength={50}
                  />
                </div>

                <button
                  onClick={handleAddToQueue}
                  disabled={!playerName.trim() || !businessCard || isSubmitting}
                  className={`w-full py-3 text-white font-bold rounded-md transition-all ${
                    playerName.trim() && businessCard && !isSubmitting
                      ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:transform active:scale-95 neon-border"
                      : "bg-gray-700 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "ADDING..." : "ADD QUEUE"}
                </button>
              </div>
            </div>
          </div>

          {/* Queue */}
          <div className="bg-black/70 rounded-xl p-6 mt-4 md:mt-0 md:flex-1 rounded">
            <h2 className="text-white text-xl font-bold mb-4 text-center">
              Queue
            </h2>
            {/* Queue table */}
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 px-4 text-left">#</th>
                    <th className="py-2 px-4 text-left w-64">Name</th>
                    <th className="py-2 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {playerQueue.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 text-center text-gray-400"
                      >
                        No players in queue
                      </td>
                    </tr>
                  ) : (
                    playerQueue.map((player, index) => (
                      <tr key={index} className="border-b border-gray-800">
                        <td className="py-2 px-4">{index + 1}</td>
                        <td className="py-2 px-4 w-48">{player.name}</td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() =>
                                handleStartGame(
                                  player.name,
                                  player.businessCard,
                                  index
                                )
                              }
                              disabled={
                                gameStatus === "in-game" ||
                                gameStatus === "offline" ||
                                isSubmitting
                              }
                              className={`px-3 py-1 rounded-md flex items-center justify-center ${
                                gameStatus === "idle" && !isSubmitting
                                  ? "bg-green-600 hover:bg-green-500 text-white"
                                  : "bg-gray-700 cursor-not-allowed text-gray-400"
                              }`}
                            >
                              <Play size={14} className="mr-1" />
                              Start
                            </button>
                            <button
                              onClick={() => handleDeleteFromQueue(index)}
                              className="px-2 py-1 rounded-md flex items-center justify-center bg-red-600 hover:bg-red-500 text-white"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-black/70 rounded-xl p-6 mt-4 md:flex-1 rounded">
          <h2 className="text-white text-xl font-bold mb-4 text-center">
            History
          </h2>
        </div>
      </div>

      <div className="text-white text-sm mb-4 opacity-70">
        Speed Rush Challenge Game v {packageVersion}
      </div>
    </div>
  );
};

export default ControlScreen;
