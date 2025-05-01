import { useState, useCallback, useEffect } from 'react';
import { GameState } from '../components/GameContainer';

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [playerName, setPlayerName] = useState<string>('');
  const [gameDuration, setGameDuration] = useState<number>(15);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  
  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('speedChallengeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
    
    const savedPlayerName = localStorage.getItem('speedChallengePlayerName');
    if (savedPlayerName) {
      setPlayerName(savedPlayerName);
    }
  }, []);
  
  // Save player name to localStorage when it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('speedChallengePlayerName', playerName);
    }
  }, [playerName]);
  
  // Reset score when starting a new game
  const startGame = useCallback(() => {
    setScore(0);
    setGameState('playing');
  }, []);
  
  // Increment score
  const incrementScore = useCallback(() => {
    setScore(prevScore => prevScore + 1);
  }, []);
  
  // End game and update high score if needed
  const endGame = useCallback(() => {
    setGameState('result');
    
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('speedChallengeHighScore', score.toString());
    }
  }, [score, highScore]);
  
  // Reset game to start state
  const resetGame = useCallback(() => {
    setGameState('start');
  }, []);
  
  return {
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
  };
};