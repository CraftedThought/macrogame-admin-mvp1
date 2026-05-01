/* src/components/builders/macrogame/TransitionRenderer.tsx */

import React, { useState, useEffect, useRef } from 'react';
import { TransitionConfig } from '../../types';

// --- Reusable Live Countdown Text ---
export const LiveCountdown: React.FC<{ template: string; duration: number; isActive?: boolean; onComplete?: () => void }> = ({ template, duration, isActive = true, onComplete }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const hasCompletedRef = useRef(false);

    // 1. Reset timer when duration changes
    useEffect(() => { 
        setTimeLeft(duration); 
        hasCompletedRef.current = false; 
    }, [duration]);

    // 2. Pure state update (No side-effects allowed inside setTimeLeft)
    useEffect(() => {
        if (!isActive || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(t => Math.max(0, t - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [isActive, timeLeft]);

    // 3. Safe side-effect execution triggered when timeLeft hits 0
    useEffect(() => {
        if (timeLeft === 0 && isActive && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            if (onComplete) onComplete();
        }
    }, [timeLeft, isActive, onComplete]);

    return <>{template.replace(/\{\{time\}\}/g, String(timeLeft))}</>;
};

interface TransitionRendererProps {
    transition?: TransitionConfig;
    onAdvance: () => void;
    isActive?: boolean;
    showLayoutGuides?: boolean;
    theme?: 'dark' | 'light';
    fontSize?: string;
    defaultButtonText?: string;
}

export const TransitionRenderer: React.FC<TransitionRendererProps> = ({
    transition,
    onAdvance,
    isActive = true,
    showLayoutGuides = false,
    theme = 'dark',
    fontSize = '1.2rem',
    defaultButtonText
}) => {
    const currentTransition = transition || {};
    const type = currentTransition.type || 'interact';
    const isAuto = type === 'auto';
    
    const interactionMethod = currentTransition.interactionMethod || 'click';
    const clickFormat = currentTransition.clickFormat || 'disclaimer';
    const isButton = !isAuto && interactionMethod === 'click' && clickFormat === 'button';

    const structGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px dashed rgba(255, 0, 0, 0.5)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 0, 0, 0.05)', boxSizing: 'border-box' } : {};

        // Calculate the physical height footprint of the button configuration to ensure 
        // disclaimers/timers take up the exact same vertical space to prevent layout shifting.
        const struct = currentTransition.buttonConfig || {};
        const btnPadV = struct.paddingVertical === '' ? 0 : (struct.paddingVertical ?? 12);
        const btnStrokeWidth = struct.strokeWidth === '' ? 0 : (struct.strokeWidth ?? 2);
        const invisibleVerticalPadding = btnPadV + btnStrokeWidth;

        if (isAuto) {
            if (!currentTransition.showCountdown) return null;
            return (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', ...structGuideStyle }}>
                    <div style={{ fontSize, fontWeight: 'bold', opacity: 0.9, padding: `${invisibleVerticalPadding}px 0` }}>
                        <LiveCountdown 
                            template={currentTransition.countdownText || 'Continuing in {{time}}'} 
                            duration={currentTransition.autoDuration || 3} 
                            isActive={isActive} 
                            onComplete={onAdvance}
                        />
                    </div>
                </div>
            );
        }

        if (isButton) {
            const buttonStyle = theme === 'light' ? (currentTransition.lightButtonStyle || {}) : (currentTransition.buttonStyle || {});
            
            const btnTextString = struct.text || defaultButtonText || 'Continue';
            const btnRadius = struct.borderRadius === '' ? 0 : (struct.borderRadius ?? 6);
            const btnPadH = struct.paddingHorizontal === '' ? 0 : (struct.paddingHorizontal ?? 32);
            const widthMode = struct.widthMode || 'wrap';
            const customWidth = struct.customWidth === '' ? 0 : (struct.customWidth ?? 50);
            const btnStrokeStyle = struct.strokeStyle || 'none';
            const hoverAnim = struct.enableHoverAnimation !== false;
            
            // Fallback colors to ensure it never renders blank
            const defaultBg = theme === 'light' ? '#333333' : '#ffffff';
            const defaultText = theme === 'light' ? '#ffffff' : '#333333';
            
            const btnBg = buttonStyle.backgroundColor || defaultBg;
            const btnText = buttonStyle.textColor || defaultText;
            const btnStrokeColor = buttonStyle.strokeColor || defaultBg;
            
            let finalWidth = 'auto';
            if (widthMode === 'max') finalWidth = '100%';
            else if (widthMode === 'custom') finalWidth = `${customWidth}%`;

            return (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', ...structGuideStyle }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAdvance(); }}
                        style={{
                            width: finalWidth,
                            padding: `${btnPadV}px ${btnPadH}px`, 
                            fontSize, 
                            fontWeight: 'bold',
                            backgroundColor: btnBg, 
                            color: btnText, 
                            border: btnStrokeStyle !== 'none' ? `${btnStrokeWidth}px ${btnStrokeStyle} ${btnStrokeColor}` : 'none', 
                            borderRadius: `${btnRadius}px`,
                            cursor: 'pointer', 
                            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                            transition: hoverAnim ? 'transform 0.1s' : 'none'
                        }}
                        onMouseEnter={(e) => { if (hoverAnim) e.currentTarget.style.transform = 'scale(1.05)' }}
                        onMouseLeave={(e) => { if (hoverAnim) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                        {btnTextString}
                    </button>
                </div>
            );
        }

        // Disclaimer / Click Anywhere
        const defaultDisclaimer = interactionMethod === 'any_interaction' ? 'Click or press any key to continue' : 'Click anywhere to continue';
        return (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', ...structGuideStyle }}>
                <div style={{ 
                    fontSize, fontWeight: 'bold', opacity: 0.9,
                    padding: `${invisibleVerticalPadding}px 0`,
                    animation: currentTransition.pulseAnimation !== false ? 'pulse 2s infinite' : 'none' 
                }}>
                    {currentTransition.disclaimerText || defaultDisclaimer}
                </div>
            </div>
        );
    };