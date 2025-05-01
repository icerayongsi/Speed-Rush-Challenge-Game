import React, { useState, useEffect } from 'react';
import StartScreen from './StartScreen';
import GameScreen from './GameScreen';
import ResultScreen from './ResultScreen';
import { useGame } from '../hooks/useGame';

export type GameState = 'start' | 'playing' | 'result';

const GameContainer: React.FC = () => {
  const [gameBackground, setGameBackground] = useState<string | null>(null);
  const {
    gameState,
    playerName,
    setPlayerName,
    gameDuration,
    setGameDuration,
    score,
    highScore,
    startGame,
    endGame,
    incrementScore,
    resetGame
  } = useGame();

  // Load background image
  useEffect(() => {
    fetch('/game-background.jpg')
      .then(response => {
        if (!response.ok) {
          throw new Error('Background image not found');
        }
        return response.url;
      })
      .then(url => setGameBackground(url))
      .catch(error => {
        console.error('Error loading background:', error);
        setGameBackground('');
      });
  }, []);

  // If background is still loading, show loading state
  if (gameBackground === null) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-black text-white">
        <div className="text-xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md h-full max-h-[800px] overflow-hidden rounded-lg shadow-2xl">
      <div 
        className="game-background w-full h-full flex flex-col justify-between items-center p-4"
        style={{ backgroundImage: `url(${gameBackground || ''})` }}
      >
        {gameState === 'start' && (
          <StartScreen 
            playerName={playerName}
            setPlayerName={setPlayerName}
            gameDuration={gameDuration}
            setGameDuration={setGameDuration}
            onStart={startGame}
            highScore={highScore}
          />
        )}
        
        {gameState === 'playing' && (
          <GameScreen 
            score={score}
            highScore={highScore}
            duration={gameDuration}
            onTap={incrementScore}
            onTimeUp={endGame}
            playerName={playerName}
          />
        )}
        
        {gameState === 'result' && (
          <ResultScreen 
            score={score}
            highScore={highScore}
            duration={gameDuration}
            playerName={playerName}
            onRestart={resetGame}
            onPlayAgain={startGame}
          />
        )}
      </div>
    </div>
  );
};

export default GameContainer;