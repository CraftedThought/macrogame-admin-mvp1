/* src/components/ui/MicrogameOverlay.tsx */

import React, { useState, useEffect } from 'react';
import { LiveCountdown } from '../previews/StaticMacrogamePreview';
import { TransitionRenderer } from '../builders/macrogame/TransitionRenderer';
import { parseGameMergeTags } from '../../utils/helpers';

interface MicrogameOverlayProps {
    name: string;
    controls: string;
    onStart: () => void;
    preGameConfig?: any;
    theme?: 'dark' | 'light';
    contentWidth?: number;
    contentHeight?: number;
    showLayoutGuides?: boolean;
    isActive?: boolean;
    hasProgressTracker?: boolean;
    hasProgressLabels?: boolean;
}

export const MicrogameOverlay: React.FC<MicrogameOverlayProps> = ({ name, controls, onStart, preGameConfig, theme = 'dark', contentWidth = 100, contentHeight = 100, showLayoutGuides = false, isActive = true, hasProgressTracker = false, hasProgressLabels = false }) => {
    const config = preGameConfig || {};
    const transition = config.transition || {};
    const isAuto = (transition.type || 'interact') === 'auto';
    const interactionMethod = transition.interactionMethod || 'click';
    const clickFormat = transition.clickFormat || 'disclaimer';
    const isButton = !isAuto && interactionMethod === 'click' && clickFormat === 'button';
    const canClickAnywhere = !isAuto && !isButton;

    useEffect(() => {
        if (!isAuto && interactionMethod === 'any_interaction') {
            const handleKeyDown = (e: KeyboardEvent) => {
                const target = e.target as HTMLElement;
                // Prevent starting the game if the user is typing in a builder input field
                if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
                onStart();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isAuto, interactionMethod, onStart]);

    const globalGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px solid rgba(255, 0, 0, 0.8)', outlineOffset: '-2px' } : {};
    const structGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px dashed rgba(255, 0, 0, 0.5)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 0, 0, 0.05)', boxSizing: 'border-box' } : {};
    const contentGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px dotted rgba(255, 193, 7, 0.9)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 193, 7, 0.15)', boxSizing: 'border-box' } : {};

    const parsedHeadline = parseGameMergeTags(config.headline || '<h1 style="text-align: center; text-transform: uppercase;">{{game_title}}</h1>', name, controls);
    const parsedBodyText = parseGameMergeTags(config.bodyText || '<p style="text-align: center; font-size: 1.25rem;">{{game_controls}}</p>', name, controls);

    return (
        <>
            <style>
                {`
                    @keyframes pulse {
                        0% { opacity: 0.6; transform: scale(0.98); }
                        50% { opacity: 1; transform: scale(1.02); }
                        100% { opacity: 0.6; transform: scale(0.98); }
                    }
                    .microgame-overlay-wrapper .ql-editor {
                        height: auto !important;
                        min-height: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        text-align: center;
                        line-height: 1.5;
                        font-size: 1.25rem;
                    }
                    .microgame-overlay-wrapper .ql-editor > * {
                        margin-top: 0 !important;
                        margin-bottom: 0 !important;
                        padding-top: 0 !important;
                        padding-bottom: 0 !important;
                    }
                    .microgame-overlay-wrapper .ql-editor p,
                    .microgame-overlay-wrapper .ql-editor h1,
                    .microgame-overlay-wrapper .ql-editor h2,
                    .microgame-overlay-wrapper .ql-editor h3,
                    .microgame-overlay-wrapper .ql-editor h4 {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .microgame-overlay-wrapper .ql-editor h1,
                    .microgame-overlay-wrapper .ql-editor h2,
                    .microgame-overlay-wrapper .ql-editor h3 {
                        line-height: 1.1 !important;
                    }
                    .microgame-overlay-wrapper .ql-editor h4 {
                        font-size: 0.75em !important; 
                        font-weight: normal !important;
                    }
                `}
            </style>
            
            {/* LAYER 2: Viewport Glass */}
            <div 
                className="microgame-overlay-wrapper" 
                onClick={canClickAnywhere ? onStart : undefined}
                style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: config.backgroundImageUrl ? 'transparent' : (theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(26,26,46,0.95)'),
                    backgroundImage: config.backgroundImageUrl ? `url("${config.backgroundImageUrl}")` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    zIndex: 10,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    color: theme === 'light' ? '#333333' : '#ffffff',
                    textShadow: theme === 'light' ? 'none' : '2px 2px 4px rgba(0,0,0,0.6)',
                    cursor: canClickAnywhere ? 'pointer' : 'default'
                }}
            >
                
                {/* LAYER 3: Global Safe Area (Red Box) - STRICT HEIGHT */}
                <div style={{
                    width: `${contentWidth}%`, 
                    height: `${contentHeight}%`,
                    display: 'flex', 
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    ...globalGuideStyle
                }}>
                    
                    {/* PADDING WRAPPER */}
                    <div style={{
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        paddingTop: `${config.paddingTop === '' ? 0 : (config.paddingTop ?? 0)}px`,
                        paddingBottom: `${config.paddingBottom === '' ? 0 : (config.paddingBottom ?? 0)}px`,
                        paddingLeft: `${config.paddingLeft === '' ? 0 : (config.paddingLeft ?? 0)}px`,
                        paddingRight: `${config.paddingRight === '' ? 0 : (config.paddingRight ?? 0)}px`,
                        boxSizing: 'border-box',
                        minHeight: 0
                    }}>

                        {/* CONTENT CENTERING WRAPPER (Split Layer Flexbox) */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100%',
                            minHeight: 0,
                            ...contentGuideStyle
                        }}>

                            {/* Top Spacer (Dynamic Buffer for Tracker) */}
                            <div style={{ flex: '1 1 auto', minHeight: hasProgressTracker ? (hasProgressLabels ? 72 : 48) : 0 }}></div>

                            {/* TOP LAYER (TEXT) */}
                            <div className="custom-scrollbar" style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
                                gap: `${config.textSpacing === '' ? 0 : (config.textSpacing ?? 16)}px`,
                                flex: '0 1 auto', overflowY: 'auto', overflowX: 'hidden', minHeight: 0
                            }}>
                                {config.headline && (
                                    <div className="ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: parsedHeadline }} />
                                )}
                                
                                {config.bodyText && (
                                    <div className="ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: parsedBodyText }} />
                                )}
                            </div>

                            {/* Gap */}
                            <div style={{ flexShrink: 0, height: `${config.blockSpacing === '' ? 0 : (config.blockSpacing ?? 32)}px` }} />
                            
                            {/* BOTTOM LAYER (BUTTONS) */}
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', flexShrink: 0 }}>
                                <TransitionRenderer 
                                    transition={transition} 
                                    onAdvance={onStart} 
                                    isActive={isActive} 
                                    showLayoutGuides={showLayoutGuides} 
                                    theme={theme}
                                    defaultButtonText="Start"
                                />
                            </div>

                            {/* Bottom Spacer */}
                            <div style={{ flex: '1 1 auto', minHeight: 0 }}></div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};