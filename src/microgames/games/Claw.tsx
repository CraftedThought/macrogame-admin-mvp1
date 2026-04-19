import React, { useState, useEffect, useRef } from 'react';
import { MicrogameProps } from '../types';

// This is a generic placeholder component for new microgames.
const ClawGame: React.FC<MicrogameProps> = ({ onEnd, gameData }) => {
  const [timeLeft, setTimeLeft] = useState(gameData.length);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Set up a countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // End the game when the timer runs out
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(intervalRef.current);
      onEnd({ win: false }); // Default to a loss if time runs out
    }
  }, [timeLeft, onEnd]);

  const handleEnd = (win: boolean) => {
    clearInterval(intervalRef.current);
    onEnd({ win });
  };

  const containerStyle: React.CSSProperties = {
    color: 'white', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    height: '100%', width: '100%', fontFamily: 'inherit',
    backgroundColor: '#2d3436',
  };

  const buttonContainerStyle: React.CSSProperties = {
    marginTop: '20px', display: 'flex', gap: '20px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px', fontSize: '1rem', cursor: 'pointer',
    border: '2px solid white', background: 'transparent', color: 'white'
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '2.5rem' }}>{gameData.name}</h1>
      <p>(Placeholder)</p>
      <h2 style={{ fontSize: '4rem', margin: '20px 0' }}>{timeLeft}</h2>
      <div style={buttonContainerStyle}>
        <button style={{...buttonStyle, borderColor: '#2ecc71'}} onClick={() => handleEnd(true)}>Force Win</button>
        <button style={{...buttonStyle, borderColor: '#e74c3c'}} onClick={() => handleEnd(false)}>Force Lose</button>
      </div>
    </div>
  );
};

export default ClawGame;