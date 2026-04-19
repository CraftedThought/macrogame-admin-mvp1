import React, { useState, useEffect, useRef } from 'react';
import { MicrogameProps } from '../types';

const BuildGame: React.FC<MicrogameProps> = ({ onEnd, gameData, isOverlayVisible, onInteraction }) => {
  const [isPausedForOverlay, setIsPausedForOverlay] = useState(isOverlayVisible);
  const [timeLeft, setTimeLeft] = useState(gameData.length);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isPausedForOverlay) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isPausedForOverlay]);

  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(intervalRef.current);
      onEnd({ win: false });
    }
  }, [timeLeft, onEnd]);

  const handleInteraction = () => {
    if (isPausedForOverlay && onInteraction) {
      onInteraction();
      setIsPausedForOverlay(false);
    }
  };

  const handleEnd = (win: boolean) => {
    clearInterval(intervalRef.current);
    onEnd({ win });
  };

  const containerStyle: React.CSSProperties = {
    color: 'white', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    height: '100%', width: '100%', fontFamily: 'inherit',
    backgroundColor: '#2d3436', position: 'relative',
    padding: '1em'
  };
  
  const overlayStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    alignItems: 'center', textAlign: 'center', backdropFilter: 'blur(3px)',
  };

  const buttonContainerStyle: React.CSSProperties = {
    marginTop: '1.5em', display: 'flex', gap: '1.5em'
  };
  
  const buttonStyle: React.CSSProperties = {
    padding: '0.5em 1em',
    fontSize: '1em',
    cursor: 'pointer',
    border: '2px solid white', background: 'transparent', color: 'white'
  };

  return (
    <div style={containerStyle} onClick={handleInteraction}>
      {isPausedForOverlay && (
        <div style={overlayStyle}>
          <h1 style={{ fontSize: '2.5em' }}>{gameData.name}</h1>
          <p style={{ fontSize: '1.2em' }}>{gameData.controls}</p>
          <span>Click to start</span>
        </div>
      )}
      <h1 style={{ fontSize: '2.5em', textAlign: 'center' }}>{gameData.name}</h1>
      <p style={{ fontSize: '1.2em' }}>(Placeholder)</p>
      <h2 style={{ fontSize: '4em', margin: '0.5em 0' }}>{timeLeft}</h2>
      <div style={buttonContainerStyle}>
        <button style={{...buttonStyle, borderColor: '#2ecc71'}} onClick={(e) => {e.stopPropagation(); handleEnd(true);}}>Force Win</button>
        <button style={{...buttonStyle, borderColor: '#e74c3c'}} onClick={(e) => {e.stopPropagation(); handleEnd(false);}}>Force Lose</button>
      </div>
    </div>
  );
};

export default BuildGame;