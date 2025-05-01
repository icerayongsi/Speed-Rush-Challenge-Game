import React, { useState, useRef, useEffect } from 'react';
import { Timer, Trophy, User, Camera, Wifi, WifiOff, Gamepad2 } from 'lucide-react';
import { socket } from '../socket';
import { API_URL } from '../App';

const ControlScreen: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [gameDuration, setGameDuration] = useState(15);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameStatus, setGameStatus] = useState<'offline' | 'idle' | 'in-game'>('offline');
  const [activePlayerName, setActivePlayerName] = useState('');
  const [activeTimer, setActiveTimer] = useState(0);
  const [gameClientsConnected, setGameClientsConnected] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    setIsUploading(true);
    
    try {
      console.log('Uploading file:', file.name, file.size, 'bytes');
      
      const response = await fetch(`${API_URL}/api/upload-profile`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status);
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Get response text first to debug
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // Parse JSON manually to better handle errors
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      if (data.success) {
        console.log('Upload successful, file path:', data.filePath);
        setProfilePicture(data.filePath);
      } else {
        console.error('Upload failed:', data.error);
        alert('Failed to upload image: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('An error occurred while uploading. Please try again.');
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
      socket.emit('request_game_client_count');
    }

    socket.on('connect', () => {
      socket.emit('request_game_client_count');
    });
    
    socket.on('disconnect', () => {
      setGameStatus('offline');
    });

    socket.on('game_start', (data) => {
      console.log('Game started:', data);
      setGameStatus('in-game');
      setActivePlayerName(data.playerName);
      setActiveTimer(data.gameDuration);
    });
    
    socket.on('game_end', () => {
      console.log('Game ended, checking game clients:', gameClientsConnected);
      // Only set to idle if there are game clients connected
      if (gameClientsConnected > 0) {
        setGameStatus('idle');
      } else {
        setGameStatus('offline');
      }
      setActivePlayerName('');
      setActiveTimer(0);
    });
    
    // Listen for game client count updates
    socket.on('game_client_count', (data) => {
      console.log('Game client count updated:', data.count);
      setGameClientsConnected(data.count);
      
      // Update status based on game client count and current status
      if (data.count > 0 && gameStatus !== 'in-game') {
        console.log('Setting status to idle because game clients > 0');
        setGameStatus('idle');
      } else if (data.count === 0 && gameStatus !== 'in-game') {
        console.log('Setting status to offline because game clients = 0');
        setGameStatus('offline');
      }
    });
    
    // Cleanup listeners on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_start');
      socket.off('game_end');
      socket.off('game_client_count');
    };
  }, [gameStatus, gameClientsConnected]);
  
  useEffect(() => {
    // Listen for timer updates from game screen
    socket.on('game_time_sync', (data) => {
      if (data.timeLeft !== undefined) {
        setActiveTimer(data.timeLeft);
      }
    });
    
    return () => {
      socket.off('game_time_sync');
    };
  }, []);

  const handleStartGame = async () => {
    if (!playerName.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playerName,
          profilePicture,
          gameDuration,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        socket.emit('start_game', { 
          playerName, 
          gameDuration,
          profilePicture 
        });
        setGameStatus('in-game');
        setActivePlayerName(playerName);
        setActiveTimer(gameDuration);
      } else {
        console.error('Failed to start game:', data.error);
        alert('Failed to start game. Please try again.');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      alert('An error occurred while starting the game. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col justify-between items-center bg-gradient-to-b from-red-900 to-black p-8">
      <div className="mt-32 w-full flex flex-col items-center">
        <h1 className="text-4xl font-bold text-white mb-8 game-title">Speed Rush Challenge</h1>
      </div>
      
      <div className="flex flex-col">
        <div className={`w-full max-w-xs bg-black/70 rounded-xl p-6 backdrop-blur-sm appear ${gameStatus === 'in-game' ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-white text-xl font-bold mb-4 text-center">Game Setup</h2>
          
          {/* Profile Picture Upload */}
          <div className="mb-6 flex flex-col items-center">
            <div 
              className="w-24 h-24 rounded-full bg-gray-800 border-2 border-red-500 flex items-center justify-center overflow-hidden mb-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={triggerFileInput}
            >
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center justify-center">
                  <User size={32} />
                  <span className="text-xs mt-1">Add Photo</span>
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
              className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : (
                <>
                  <Camera size={12} />
                  {profilePicture ? 'Change Photo' : 'Upload Photo'}
                </>
              )}
            </button>
          </div>
          
          <div className="mb-4">
            <label htmlFor="playerName" className="block text-white text-sm mb-1">
              Player Name:
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
              className="w-full p-2 bg-gray-800 text-white border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              maxLength={15}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-white text-sm mb-1">
              Game Duration:
            </label>
            <div className="flex justify-between gap-2">
              {[10, 20, 30].map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => setGameDuration(seconds)}
                  className={`flex-1 py-2 px-3 rounded flex items-center justify-center ${
                    gameDuration === seconds
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Timer size={16} className="mr-1" />
                  {seconds}s
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleStartGame}
            disabled={!playerName.trim() || isSubmitting}
            className={`w-full py-3 text-white font-bold rounded-md transition-all ${
              playerName.trim() && !isSubmitting
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:transform active:scale-95 neon-border'
                : 'bg-gray-700 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'STARTING...' : 'START CHALLENGE'}
          </button>
        </div>
        { /* Game Status */ }
        <div className="w-full max-w-xs bg-black/70 rounded-xl p-4 backdrop-blur-sm appear mt-2">
          <h2 className="text-white text-sm text-center mb-2">Game Status</h2>
          
          {gameStatus === 'offline' && (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center mb-1">
                <WifiOff size={18} className="text-red-500 mr-2" />
                <h2 className="text-red-500 text-xl font-bold">Offline</h2>
              </div>
              <p className="text-gray-400 text-xs text-center">No game screen open</p>
            </div>
          )}
          
          {gameStatus === 'idle' && (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center mb-1">
                <Wifi size={18} className="text-green-500 mr-2" />
                <h2 className="text-green-500 text-xl font-bold">Idle</h2>
              </div>
              <p className="text-gray-400 text-xs text-center">Ready to play</p>
            </div>
          )}
          
          {gameStatus === 'in-game' && (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center mb-1">
                <Gamepad2 size={18} className="text-yellow-500 mr-2" />
                <h2 className="text-yellow-500 text-xl font-bold">In Game</h2>
              </div>
              <div className="flex items-center justify-between w-full mt-2">
                <div className="flex items-center">
                  <User size={14} className="text-gray-400 mr-1" />
                  <p className="text-white text-sm">{activePlayerName}</p>
                </div>
                <div className="flex items-center">
                  <Timer size={14} className="text-gray-400 mr-1" />
                  <p className="text-white text-sm digital-font">{activeTimer.toFixed(1)}s</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      

      <div className="text-white text-sm mb-4 opacity-70">
        Open the game screen on another device and control from here
      </div>
    </div>
  );
};

export default ControlScreen;