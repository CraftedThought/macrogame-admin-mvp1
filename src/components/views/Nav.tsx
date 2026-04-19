// src/components/views/Nav.tsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { styles } from '../../App.styles';
import { signOutUser } from '../../firebase/auth';
import { useData } from '../../hooks/useData';

export const Nav: React.FC = () => {
    const { isGuidedMode, setState } = useData();
    
    // The NavLink component provides an `isActive` boolean to its children.
    // We can use a function to dynamically apply our active style.
    const getNavStyle = ({ isActive }: { isActive: boolean }) => 
        isActive 
            ? {...styles.navButton, ...styles.navButtonActive} 
            : styles.navButton;

    return (
        <nav style={styles.nav}>
            <NavLink to="/creator" style={getNavStyle}>Macrogame Creator</NavLink>
            <NavLink to="/manager" style={getNavStyle}>Macrogames</NavLink>
            <NavLink to="/delivery" style={getNavStyle}>Delivery</NavLink>
            <NavLink to="/campaigns" style={getNavStyle}>Campaigns</NavLink>
            <NavLink to="/microgames" style={getNavStyle}>Microgames</NavLink>
            <NavLink to="/conversions" style={getNavStyle}>Conversions</NavLink>           
            {/* Dev Mode Toggle: "Brain" Switch for Guided Intelligence Layer */}
            <button 
                onClick={() => setState({ isGuidedMode: !isGuidedMode })}
                title={isGuidedMode ? "Disable Guided Mode (Show Raw Platform)" : "Enable Guided Mode (Show Intelligence Layer)"}
                style={{
                    background: 'none',
                    border: isGuidedMode ? '1px solid #0866ff' : '1px solid #ccc',
                    backgroundColor: isGuidedMode ? '#ebf5ff' : 'transparent',
                    borderRadius: '20px',
                    padding: '0.25rem 0.75rem',
                    cursor: 'pointer',
                    marginLeft: 'auto', // Push to the right
                    marginRight: '1rem',
                    fontSize: '1.2rem',
                    opacity: isGuidedMode ? 1 : 0.6,
                    filter: isGuidedMode ? 'none' : 'grayscale(100%)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                🧠 <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isGuidedMode ? '#0866ff' : '#666' }}>{isGuidedMode ? 'ON' : 'OFF'}</span>
            </button>

            <button onClick={signOutUser} style={{ ...styles.navButton }}>Sign Out</button>
        </nav>
    );
};