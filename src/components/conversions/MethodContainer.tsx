/* src/components/conversions/MethodContainer.tsx */

import React, { useState, useEffect } from 'react';
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
    // Determine visibility of the mask
    // If it's covered, show mask. If not, hide it.
    // The MethodMask component handles the fade-out animation internally when isRevealed changes.
    
    // We pass `isRevealed` as `!isCovered`. 
    // When `isCovered` goes from true -> false, MethodMask triggers fade out.

    return (
        <div style={{ 
            position: 'relative', // Ensure context
            display: 'grid', 
            gridTemplateAreas: '"stack"', 
            width: '100%', 
            isolation: 'isolate',
            alignItems: 'center', 
            justifyItems: 'stretch'
        }}>
            
            {/* 1. THE CONTENT LAYER */}
            <div style={{ 
                gridArea: 'stack',
                zIndex: 1,
                filter: isCovered ? 'blur(4px) grayscale(100%)' : 'none',
                opacity: isCovered ? 0.3 : 1,
                pointerEvents: isCovered ? 'none' : 'auto',
                transition: 'filter 0.5s ease, opacity 0.5s ease',
                width: '100%'
            }}>
                {children}
            </div>

            {/* 2. THE MASK LAYER */}
            {maskConfig && (
                <div style={{ gridArea: 'stack', zIndex: 10, width: '100%', height: '100%' }}>
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