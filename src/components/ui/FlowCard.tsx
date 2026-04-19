// src/components/ui/FlowCard.tsx

import React from 'react';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';

interface FlowCardProps {
    flowItem: { baseGame: Microgame; customVariant?: CustomMicrogame; points?: number };
    index: number;
    onMove: (direction: 'up' | 'down') => void;
    onDuplicate: () => void;
    onRemove: () => void;
    isFirst: boolean;
    isLast: boolean;
    onPointsChange?: (newPoints: number) => void;
    isSelected?: boolean;
}

export const FlowCard: React.FC<FlowCardProps> = ({ flowItem, index, onMove, onDuplicate, onRemove, isFirst, isLast, onPointsChange = undefined, isSelected = false }) => {
    const isArchived = flowItem.baseGame.isActive === false;
    const displayName = flowItem.customVariant ? `${flowItem.customVariant.name} [${flowItem.baseGame.name}]` : flowItem.baseGame.name;
    
    const cardStyle: React.CSSProperties = {
        ...styles.flowCard,
        ...(isArchived ? styles.flowCardArchived : {}),
        borderWidth: isSelected ? '2px' : '1px',
        borderStyle: 'solid',
        borderColor: isSelected ? '#0866ff' : 'transparent',
        backgroundColor: isSelected ? '#f0f7ff' : '#fff',
        boxShadow: isSelected ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
        position: 'relative' // Ensure absolute positioning works for the remove button
    };

    return (
        <div style={cardStyle}>
            <div style={styles.flowCardStep}>{index + 1}</div>
            <button 
                title="Remove from Flow" 
                onClick={(e) => { 
                    e.stopPropagation(); // Stop the click from highlighting the card
                    onRemove(); 
                }} 
                style={{
                    position: 'absolute', top: '-8px', right: '-8px', 
                    background: '#e74c3c', color: 'white', border: 'none', 
                    borderRadius: '50%', width: '22px', height: '22px', 
                    fontSize: '12px', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            >
                ✕
            </button>
            <span>{displayName}</span>
            {onPointsChange !== undefined && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <label htmlFor={`points-${index}`}>Points:</label>
                    <input
                        id={`points-${index}`}
                        type="number"
                        value={flowItem.points || 0}
                        onChange={(e) => {
                            if (onPointsChange) {
                                onPointsChange(parseInt(e.target.value, 10) || 0);
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '60px', padding: '0.2rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>
            )}
            {isArchived && <span style={styles.archivedText}>(Archived)</span>}
            <div style={styles.flowCardActions}>
                <button title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} style={styles.flowCardButton}>❐</button>
                <button title="Move Up" disabled={isFirst} onClick={(e) => { e.stopPropagation(); onMove('up'); }} style={styles.flowCardButton}>▲</button>
                <button title="Move Down" disabled={isLast} onClick={(e) => { e.stopPropagation(); onMove('down'); }} style={styles.flowCardButton}>▼</button>
            </div>
        </div>
    );
};