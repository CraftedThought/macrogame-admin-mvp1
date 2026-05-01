import React from 'react';
import { MethodMask } from './MethodMask';
import { MaskConfig } from '../../types';

interface MethodContainerProps {
    children: React.ReactNode;
    maskConfig?: MaskConfig;
    isCovered: boolean;
    onInteraction?: () => void; // Triggered when mask is clicked (Reveal or Unlock)
    actionSlot?: React.ReactNode; // For buttons/progress bars inside the mask
    themeMode?: 'dark' | 'light';
    parentStyle?: any;
}

export const MethodContainer: React.FC<MethodContainerProps> = ({
    children,
    maskConfig,
    isCovered,
    onInteraction,
    actionSlot,
    themeMode = 'dark',
    parentStyle
}) => {
    return (
        <div style={{ 
            display: 'grid', 
            width: '100%', 
            alignItems: 'stretch', // Forces both layers to stretch to the max height
            justifyItems: 'stretch'
        }}>
            
            {/* 1. THE CONTENT LAYER */}
            <div style={{ 
                gridArea: '1 / 1', // Places in row 1, column 1
                zIndex: 1,
                filter: isCovered ? 'blur(4px) grayscale(100%)' : 'none',
                opacity: isCovered ? 0.3 : 1,
                pointerEvents: isCovered ? 'none' : 'auto',
                transition: 'filter 0.5s ease, opacity 0.5s ease',
                width: '100%',
                minHeight: 0
            }}>
                {children}
            </div>

            {/* 2. THE MASK LAYER */}
            {maskConfig && (
                <div style={{ 
                    gridArea: '1 / 1', // Places exactly over the content layer
                    zIndex: 10, 
                    width: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    minHeight: 0
                }}>
                    <MethodMask 
                        config={maskConfig}
                        isRevealed={!isCovered} 
                        onInteraction={onInteraction}
                        actionSlot={actionSlot}
                        themeMode={themeMode}
                        mode="stack"
                        parentStyle={parentStyle}
                    />
                </div>
            )}
        </div>
    );
};