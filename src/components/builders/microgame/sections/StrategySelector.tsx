/* src/components/builders/microgame/sections/StrategySelector.tsx */

import React from 'react';
import { Microgame } from '../../../../types';
import { styles } from '../../../../App.styles';

interface StrategySelectorProps {
    isGuidedMode: boolean;
    configMode: 'manual' | 'strategy';
    setConfigMode: (mode: 'manual' | 'strategy') => void;
    baseGame: Microgame;
    activeStrategy: string | null;
    applyPreset: (pillarId: string) => void;
}

export const StrategySelector: React.FC<StrategySelectorProps> = ({
    isGuidedMode,
    configMode,
    setConfigMode,
    baseGame,
    activeStrategy,
    applyPreset
}) => {
    // Only show if Guided Mode is ON and the game has strategy metadata
    if (!isGuidedMode || !(baseGame.conversionMetadata as any)?.presets) return null;

    return (
        <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ ...styles.h4, margin: 0 }}>Configuration Mode</h4>
                
                {/* Mode Toggle */}
                <div style={{ display: 'flex', backgroundColor: '#f0f2f5', borderRadius: '6px', padding: '2px' }}>
                    <button
                        type="button"
                        onClick={() => setConfigMode('manual')}
                        style={{
                            padding: '0.4rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            backgroundColor: configMode === 'manual' ? '#fff' : 'transparent',
                            color: configMode === 'manual' ? '#0866ff' : '#666',
                            boxShadow: configMode === 'manual' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Manual
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfigMode('strategy')}
                        style={{
                            padding: '0.4rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            backgroundColor: configMode === 'strategy' ? '#fff' : 'transparent',
                            color: configMode === 'strategy' ? '#0866ff' : '#666',
                            boxShadow: configMode === 'strategy' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Strategy Presets
                    </button>
                </div>
            </div>

            {/* Strategy Cards (Only visible in Strategy Mode) */}
            {configMode === 'strategy' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    {['drive_sales', 'capture_leads', 'boost_engagement'].map((pillar) => {
                        const metadata = baseGame.conversionMetadata as any;
                        const preset = metadata.presets?.[pillar];
                        const score = metadata.pillars?.[pillar]?.score;
                        const isActive = activeStrategy === pillar;

                        // If no preset exists for this pillar, skip
                        if (!preset) return null;

                        return (
                            <div 
                                key={pillar}
                                onClick={() => applyPreset(pillar)}
                                style={{
                                    border: isActive ? '2px solid #0866ff' : '1px solid #ddd',
                                    backgroundColor: isActive ? '#f0f7ff' : '#fff',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 'bold', 
                                        textTransform: 'uppercase', 
                                        color: isActive ? '#0866ff' : '#666' 
                                    }}>
                                        {pillar.replace('_', ' ')}
                                    </span>
                                    {score && (
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            backgroundColor: score >= 8 ? '#d1e7dd' : '#fff3cd', 
                                            color: score >= 8 ? '#0f5132' : '#664d03',
                                            padding: '2px 6px', 
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}>
                                            {score}/10
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem', color: '#333' }}>
                                    {preset.label}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#666', margin: 0, lineHeight: 1.4 }}>
                                    {preset.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};