/* src/components/conversions/MethodMask.tsx */

import React, { useState, useEffect } from 'react';
import { MaskConfig } from '../../types';

interface MethodMaskProps {
    config: MaskConfig;
    isRevealed?: boolean; 
    onInteraction?: (e: React.MouseEvent) => void; 
    actionSlot?: React.ReactNode; 
    themeMode?: 'dark' | 'light';
    mode?: 'overlay' | 'block' | 'stack';
    parentStyle?: any; 
}

export const MethodMask: React.FC<MethodMaskProps> = ({ 
    config, 
    isRevealed = false, 
    onInteraction, 
    actionSlot,
    themeMode = 'dark',
    mode = 'block',
    parentStyle
}) => {
    const [isFading, setIsFading] = useState(false);
    const [isVisible, setIsVisible] = useState(!isRevealed);

    useEffect(() => {
        if (isRevealed) {
            if (config.animation === 'fade') {
                setIsFading(true);
                const timer = setTimeout(() => {
                    setIsVisible(false);
                    setIsFading(false);
                }, 500);
                return () => clearTimeout(timer);
            } else {
                setIsVisible(false);
            }
        } else {
            setIsVisible(true);
            setIsFading(false);
        }
    }, [isRevealed, config.animation]);

    if (!isVisible) return null;

    const isLight = themeMode === 'light';
    const activeTheme = isLight ? config.lightStyle : config.style;
    
    // Default fallback values
    const bg = activeTheme?.backgroundColor || '#1a1a1a';
    const text = activeTheme?.textColor || '#ffffff';
    const strokeC = activeTheme?.strokeColor || '#cfc33a';
    
    // Handle empty string from form input as 0 to ensure valid CSS generation
    const strokeW = (config.strokeWidth === '' || config.strokeWidth === undefined || config.strokeWidth === null) ? 0 : config.strokeWidth;
    const strokeS = config.strokeStyle || 'none';
    
    // INHERITANCE LOGIC:
    const pt = parentStyle?.paddingTop ?? config.paddingTop ?? 20;
    const pb = parentStyle?.paddingBottom ?? config.paddingBottom ?? 20;
    const px = parentStyle?.paddingX ?? config.paddingX ?? 20;
    const gap = parentStyle?.spacing ?? config.spacing ?? 15;
    
    // Border Radius Inheritance (Default to 8px if not defined in parent)
    const radius = parentStyle?.borderRadius ?? 8;

    // Box Shadow Inheritance
    let boxShadow = 'none';
    if (parentStyle?.boxShadowOpacity) {
        boxShadow = `0 10px 25px rgba(0,0,0,${Number(parentStyle.boxShadowOpacity) / 100})`;
    } else if (parentStyle?.boxShadow) {
        boxShadow = parentStyle.boxShadow;
    }

    // --- MODE STYLES ---
    let positionStyles: React.CSSProperties = {};

    if (mode === 'overlay') {
        positionStyles = {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10,
            borderRadius: 4,
            height: '100%',
            // Box Shadow Inheritance for Code Reveal
            boxShadow: boxShadow,
            
            // Force NO STROKE for Code Reveal per requirement
            border: 'none', 
            
            // Reset box sizing since we removed the border
            boxSizing: 'border-box',
            
            // Offset positioning to center if outer border exists (though border is none here, logic preserved for safety)
            marginLeft: strokeS !== 'none' ? `-${strokeW}px` : 0,
            marginTop: strokeS !== 'none' ? `-${strokeW}px` : 0,
        };
    } else if (mode === 'stack') {
        positionStyles = {
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: radius,
            boxSizing: 'border-box',
            minHeight: '100%',
            // Box Shadow Inheritance for Full Mask
            boxShadow: boxShadow 
        };
    } else {
        // Block
        positionStyles = {
            position: 'relative',
            width: '100%',
            minHeight: '200px',
            borderRadius: radius,
            marginBottom: '1rem',
            boxSizing: 'border-box'
        };
    }

    return (
        <div 
            onClick={onInteraction}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                
                backgroundColor: bg,
                color: text,
                border: `${strokeW}px ${strokeS} ${strokeC}`,
                
                paddingTop: `${pt}px`,
                paddingBottom: `${pb}px`,
                paddingLeft: `${px}px`,
                paddingRight: `${px}px`,
                gap: `${gap}px`,

                cursor: onInteraction ? 'pointer' : 'default',
                userSelect: 'none',

                opacity: isFading ? 0 : 1,
                transition: 'opacity 0.5s ease',
                pointerEvents: isFading ? 'none' : 'auto', 

                ...positionStyles
            }}
        >
            {config.showIcon && (
                <div style={{ fontSize: '2rem', lineHeight: 1 }}>
                    🔒
                </div>
            )}

            {config.headline && (
                <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '1.2rem', 
                    textAlign: 'center',
                    width: '100%', // Ensure it respects container width
                    overflowWrap: 'break-word' // Force wrap if words are too long
                }}>
                    {config.headline}
                </div>
            )}
            
            {config.body && (
                <div style={{ fontSize: '0.9rem', opacity: 0.9, textAlign: 'center' }}>
                    {config.body}
                </div>
            )}

            {actionSlot && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    {actionSlot}
                </div>
            )}
        </div>
    );
};