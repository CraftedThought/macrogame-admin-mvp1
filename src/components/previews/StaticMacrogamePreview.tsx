/* src/components/previews/StaticMacrogamePreview.tsx */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Macrogame, Microgame as MicrogameData, MicrogameResult, ScreenConfig, ConversionScreen } from '../../types';
import { useMacroGameEngine } from '../../hooks/useMacroGameEngine';
import { useData } from '../../hooks/useData';
import { MICROGAME_DEFINITIONS } from '../../microgames/definitions/index';
import { MICROGAME_COMPONENTS } from '../../microgames/registry';
import { UnifiedGameChrome } from '../ui/UnifiedGameChrome';
import { MicrogameResultOverlay } from '../ui/MicrogameResultOverlay';
import { ConversionScreenHost } from '../conversions/ConversionScreenHost';
import { AutoTransitionOverlay } from '../ui/TransitionRenderer';
import { parseGameMergeTags } from '../../utils/helpers';
import { TransitionRenderer, LiveCountdown } from '../builders/macrogame/TransitionRenderer';
import { styles } from '../../App.styles';
import 'react-quill-new/dist/quill.snow.css';


const ORIENTATIONS = {
    landscape: { label: 'Landscape (16:9)', width: 960, height: 540 }, 
    portrait: { label: 'Portrait (9:16)', width: 360, height: 640 }    
};

// --- CSS for Text Editor Previews ---
const quillCssBlock = `
    /* Force reset padding and margins for Quill editor */
    .link-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.5;
        color: inherit;
        text-align: left; /* Default to left to match editor; specific alignment classes will override */
        font-size: 1.25rem; /* Base size for normal text to match editor */
    }
    
    /* Target all children to ensure no margins leak */
    .link-content-wrapper.ql-editor > * {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }

    /* Standard Quill Resets */
    .link-content-wrapper.ql-editor h1,
    .link-content-wrapper.ql-editor h2,
    .link-content-wrapper.ql-editor h3,
    .link-content-wrapper.ql-editor h4,
    .link-content-wrapper.ql-editor p { 
        margin: 0 !important; 
        padding: 0 !important; 
    }
    .link-content-wrapper.ql-editor h1, .link-content-wrapper.ql-editor h2, .link-content-wrapper.ql-editor h3 { line-height: 1.1 !important; }
    .link-content-wrapper.ql-editor h4 { font-size: 0.75em !important; font-weight: normal !important; }
    
    /* List Handling - Critical for Live Preview */
    .link-content-wrapper.ql-editor ul, .link-content-wrapper.ql-editor ol { 
        padding-left: 0 !important; 
        margin-left: 0 !important; 
        list-style-position: inside !important;
        text-align: left; /* Lists usually look best left-aligned even on centered screens */
        display: inline-block; /* Allows list to sit inside centered container nicely */
        width: 100%;
    }
    .link-content-wrapper.ql-editor li { padding: 0 !important; margin: 0 !important; }
    
    /* Font Sizes */
    .link-content-wrapper.ql-editor .ql-size-10px { font-size: 10px; }
    .link-content-wrapper.ql-editor .ql-size-12px { font-size: 12px; }
    .link-content-wrapper.ql-editor .ql-size-14px { font-size: 14px; }
    .link-content-wrapper.ql-editor .ql-size-16px { font-size: 16px; }
    .link-content-wrapper.ql-editor .ql-size-18px { font-size: 18px; }
    .link-content-wrapper.ql-editor .ql-size-24px { font-size: 24px; }
    .link-content-wrapper.ql-editor .ql-size-32px { font-size: 32px; }
    .link-content-wrapper.ql-editor .ql-size-48px { font-size: 48px; }
    
    /* Links */
    .link-content-wrapper.ql-editor a { color: inherit; text-decoration: underline; }
`;

// --- Shared Canvas Renderer for Intro & Promo Screens ---
const CanvasScreenRenderer: React.FC<{
    config: any;
    isLightMode: boolean;
    textStyles: React.CSSProperties;
    contentWidth: number;
    contentHeight: number;
    globalGuideStyle: React.CSSProperties;
    contentGuideStyle: React.CSSProperties;
    structGuideStyle: React.CSSProperties;
    onAdvance: () => void;
    isActive: boolean;
    showLayoutGuides: boolean;
    theme: 'dark' | 'light';
    altText: string;
    defaultButtonText: string;
}> = ({ config, isLightMode, textStyles, contentWidth, contentHeight, globalGuideStyle, contentGuideStyle, structGuideStyle, onAdvance, isActive, showLayoutGuides, theme, altText, defaultButtonText }) => {
    const getSafePx = (val: any, defaultVal: number = 0) => `${(val === '' || val === undefined || val === null || Number.isNaN(Number(val))) ? defaultVal : Number(val)}px`;
    const getSafeNum = (val: any, defaultVal: number = 0) => (val === '' || val === undefined || val === null || Number.isNaN(Number(val))) ? defaultVal : Number(val);

    const transition = config.transition || {};
    const isAuto = (transition.type || 'auto') === 'auto';
    const interactionMethod = transition.interactionMethod || 'click';
    const clickFormat = transition.clickFormat || 'disclaimer';
    const isButton = !isAuto && interactionMethod === 'click' && clickFormat === 'button';
    const canClickAnywhere = !isAuto && !isButton;

    // Merge the base styles (which hold the layout properties) with the light styles (which override the colors)
    const activeStyle = { 
        ...(config.style || {}), 
        ...(isLightMode ? (config.lightStyle || {}) : {}) 
    };
    
    const vAlign = activeStyle.verticalAlign || 'center';
    const justifyMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
    const safeJustify = justifyMap[vAlign as keyof typeof justifyMap] || 'center';

    const containerStyle: React.CSSProperties = { 
        ...textStyles, 
        textShadow: (config.textShadowEnabled ?? false) ? '2px 2px 4px rgba(0,0,0,0.6)' : 'none',
        ...(config.backgroundImageUrl && { backgroundImage: `url("${config.backgroundImageUrl}")` }),
        ...(activeStyle.backgroundColor && { backgroundColor: activeStyle.backgroundColor }),
        ...(activeStyle.textColor && { color: activeStyle.textColor }),
        justifyContent: safeJustify,
        ...(canClickAnywhere && { cursor: 'pointer' })
    };

    const layout = config.spotlightImageLayout;
    const contentGap = getSafePx(activeStyle.contentGap, 0);
    const spotSize = getSafeNum(activeStyle.spotlightSize, 40);
    const spotScale = getSafeNum(activeStyle.spotlightScale, 100);
    const spotFit = activeStyle.spotlightFit || 'cover';
    const spotRadius = getSafePx(activeStyle.spotlightBorderRadius, 0);
    
    const alignXMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const alignYMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
    const spotJustify = alignXMap[(activeStyle.spotlightAlignX || 'center') as keyof typeof alignXMap];
    const spotAlignItems = alignYMap[(activeStyle.spotlightAlignY || 'center') as keyof typeof alignYMap];

    const isHorizontal = layout === 'left' || layout === 'right';

    const contentContainerStyle: React.CSSProperties = { 
        display: 'flex', width: '100%', height: '100%', alignItems: 'stretch', justifyContent: 'center', gap: contentGap 
    };
    if (layout === 'left') contentContainerStyle.flexDirection = 'row';
    if (layout === 'right') contentContainerStyle.flexDirection = 'row-reverse';
    if (layout === 'top') contentContainerStyle.flexDirection = 'column';
    if (layout === 'bottom') contentContainerStyle.flexDirection = 'column-reverse';

    const imageFlexStyle: React.CSSProperties = {
        flex: `${spotSize}`, width: isHorizontal ? '0' : '100%', height: isHorizontal ? '100%' : '0',
        minWidth: 0, minHeight: 0, ...structGuideStyle
    };

    const imageInnerStyle: React.CSSProperties = {
        width: '100%', height: '100%', boxSizing: 'border-box',
        display: 'flex', justifyContent: spotJustify, alignItems: spotAlignItems,
        paddingTop: getSafePx(activeStyle.spotlightPaddingTop, 0),
        paddingBottom: getSafePx(activeStyle.spotlightPaddingBottom, 0),
        paddingLeft: getSafePx(activeStyle.spotlightPaddingLeft, 0),
        paddingRight: getSafePx(activeStyle.spotlightPaddingRight, 0),
    };

    const textFlexStyle: React.CSSProperties = {
        flex: `${100 - spotSize}`, width: isHorizontal ? '0' : '100%', height: isHorizontal ? '100%' : '0',
        minWidth: 0, minHeight: 0, ...structGuideStyle
    };

    const textInnerStyle: React.CSSProperties = {
        width: '100%', height: '100%', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: getSafePx(activeStyle.textPaddingTop, 0),
        paddingBottom: getSafePx(activeStyle.textPaddingBottom, 0),
        paddingLeft: getSafePx(activeStyle.textPaddingLeft, 0),
        paddingRight: getSafePx(activeStyle.textPaddingRight, 0),
    };

    const imageStyle: React.CSSProperties = { 
        width: `${spotScale}%`, height: `${spotScale}%`, objectFit: spotFit as any, borderRadius: spotRadius,
        ...contentGuideStyle
    };

    const progressBuffer = config.hasProgressTracker ? (config.hasProgressLabels ? 72 : 48) : 0;
    const topSpacer = (safeJustify === 'center' || safeJustify === 'flex-end') ? <div style={{ flex: '1 1 auto', minHeight: progressBuffer }}></div> : null;
    const bottomSpacer = (safeJustify === 'center' || safeJustify === 'flex-start') ? <div style={{ flex: '1 1 auto', minHeight: 0 }}></div> : null;

    const innerContent = (
        <div style={{ 
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', 
            width: '100%', minHeight: 0, ...contentGuideStyle 
        }}>
            {topSpacer}
            
            <div className="custom-scrollbar" style={{
                display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', 
                gap: `${activeStyle.spacing === '' ? 0 : (activeStyle.spacing ?? 12)}px`,
                flex: '0 1 auto', overflowY: 'auto', overflowX: 'hidden', minHeight: 0
            }}>
                {config.headline && (
                    <div className="link-content-wrapper ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: config.headline }} />
                )}
                {config.bodyText && (
                    <div className="link-content-wrapper ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: config.bodyText }} />
                )}
            </div>

            <div style={{ flexShrink: 0, height: `${activeStyle.blockSpacing === '' ? 0 : (activeStyle.blockSpacing ?? 24)}px` }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', flexShrink: 0 }}>
                <TransitionRenderer 
                    transition={transition} 
                    onAdvance={onAdvance} 
                    isActive={isActive} 
                    showLayoutGuides={showLayoutGuides} 
                    theme={theme} 
                    defaultButtonText={defaultButtonText}
                />
            </div>
            
            {bottomSpacer}
        </div>
    );

    return ( 
        <div style={containerStyle} onClick={canClickAnywhere ? onAdvance : undefined}>
            {/* STRICT HEIGHT WRAPPER (No scrolling here) */}
            <div style={{ 
                width: `100%`, 
                height: `${contentHeight}%`, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                boxSizing: 'border-box'
            }}>
                {/* SAFE AREA (Red Box) */}
                <div style={{ 
                    width: `${contentWidth}%`, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    boxSizing: 'border-box',
                    ...globalGuideStyle 
                }}>
                    <div style={{
                        width: '100%',
                        flex: 1, 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minHeight: 0 // CRITICAL for nested Flexbox scrolling
                    }}>
                        {layout ? (
                            <div style={{...contentContainerStyle, minHeight: 0}}>
                                <div style={{...imageFlexStyle, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
                                    <div style={{...imageInnerStyle, flex: 1, minHeight: 0}}>
                                        {config.spotlightImageUrl ? (
                                            <img src={config.spotlightImageUrl} style={imageStyle} alt={altText} />
                                        ) : (
                                            showLayoutGuides && (
                                                <div style={{ ...imageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4a007', fontWeight: 'bold', textAlign: 'center' }}>
                                                    Image Area ({spotSize}%)
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div style={{...textFlexStyle, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
                                    <div style={{...textInnerStyle, flex: 1, minHeight: 0}}>
                                        {innerContent}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ ...textInnerStyle, ...structGuideStyle, flex: 1, minHeight: 0, width: '100%' }}>
                                {innerContent}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {config.clickToContinue && ( <p style={{ position: 'absolute', bottom: '1em', fontSize: '1.4em', background: 'rgba(0,0,0,0.7)', padding: '0.5em 0.8em', borderRadius: '5px', zIndex: 10, color: 'white' }}> Click to continue </p> )} 
        </div> 
    );
};

// --- Embedded Static Screen ---
const StaticScreen: React.FC<{
    view: string;
    data: any;
    activeGameData: MicrogameData | null;
    result: MicrogameResult | null;
    handleRestart: () => void;
    advanceFromIntro: () => void;
    advanceFromPromo: () => void;
    advancePreGame: () => void;
    totalScore: number;
    pointCosts: { [key: string]: number };
    redeemPoints: (amount: number) => void;
    playEventAudio?: (eventName: string) => boolean;
    playClickAudio?: (buttonType?: 'primary' | 'secondary') => void;
    playScreenTransitionAudio?: () => void;
    playTimerTickAudio?: () => void;
    playTimerGoAudio?: () => void;
}> = ({ view, data, activeGameData, result, handleRestart, advanceFromIntro, advanceFromPromo, advancePreGame, totalScore, pointCosts, redeemPoints, playEventAudio, playClickAudio, playScreenTransitionAudio, playTimerTickAudio, playTimerGoAudio, start }) => {

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            let currentTransition;
            let advanceFn;
            
            if (view === 'intro') {
                currentTransition = data.macrogame.introScreen?.transition;
                advanceFn = advanceFromIntro;
            } else if (view === 'promo') {
                currentTransition = data.macrogame.promoScreen?.transition;
                advanceFn = advanceFromPromo;
            } else if (view === 'title' || view === 'controls' || view === 'combined') {
                currentTransition = data.macrogame.config.preGameConfig?.transition;
                advanceFn = advancePreGame;
            }

            if (currentTransition?.type === 'interact' && currentTransition?.interactionMethod === 'any_interaction') {
                advanceFn?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, data.macrogame, advanceFromIntro, advanceFromPromo, advancePreGame]);

    const isLightMode = data.macrogame.globalStyling?.theme === 'light';
    const textStyles: React.CSSProperties = { 
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
        textAlign: 'center', boxSizing: 'border-box', backgroundSize: 'cover', backgroundPosition: 'center',
        
        // --- DYNAMIC GLOBAL STYLES ---
        fontFamily: data.macrogame.globalStyling?.fontFamily || 'system-ui, sans-serif', 
        backgroundColor: isLightMode ? '#ffffff' : '#1a1a2e',
        color: isLightMode ? '#333333' : '#ffffff',
        textShadow: isLightMode ? 'none' : '2px 2px 4px rgba(0,0,0,0.6)',
    };

    // The "Ripple" Logic: Pull width from linked Conversion Screen, fallback to global styling.
    const contentWidth = data.contentWidth ?? 100;
    const contentHeight = data.contentHeight ?? 100;

    // --- 3-TIER LAYOUT GUIDES ---
    const globalGuideStyle: React.CSSProperties = data.showLayoutGuides ? { outline: '2px solid rgba(255, 0, 0, 0.8)', outlineOffset: '-2px' } : {};
    const structGuideStyle: React.CSSProperties = data.showLayoutGuides ? { outline: '2px dashed rgba(255, 0, 0, 0.5)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 0, 0, 0.05)', boxSizing: 'border-box' } : {};
    const contentGuideStyle: React.CSSProperties = data.showLayoutGuides ? { outline: '2px dotted rgba(255, 193, 7, 0.9)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 193, 7, 0.15)', boxSizing: 'border-box' } : {};

    switch (view) {
        case 'intro': {
            return (
                <CanvasScreenRenderer 
                    config={{ ...data.macrogame.introScreen, hasProgressTracker: data.macrogame.config.showProgress, hasProgressLabels: data.macrogame.config.progressShowLabels }}
                    isLightMode={isLightMode}
                    textStyles={textStyles}
                    contentWidth={contentWidth}
                    contentHeight={contentHeight}
                    globalGuideStyle={globalGuideStyle}
                    contentGuideStyle={contentGuideStyle}
                    structGuideStyle={structGuideStyle}
                    onAdvance={advanceFromIntro}
                    isActive={data.isCountdownActive}
                    showLayoutGuides={data.showLayoutGuides}
                    theme={data.macrogame.globalStyling?.theme || 'dark'}
                    altText="Intro Spotlight"
                    defaultButtonText="Start"
                />
            );
        }
        case 'title':
        case 'controls':
        case 'combined': {
            // Pull specific game's pre-game config, fallback to global
            const preGame = (activeGameData as any)?.preGameConfig || data.macrogame.config.preGameConfig || {};
            const transition = preGame.transition || {};
            const isAuto = (transition.type || 'interact') === 'auto';
            const interactionMethod = transition.interactionMethod || 'click';
            const clickFormat = transition.clickFormat || 'disclaimer';
            const isButton = !isAuto && interactionMethod === 'click' && clickFormat === 'button';
            const canClickAnywhere = !isAuto && !isButton;

            return (
                <div 
                    style={textStyles} 
                    onClick={canClickAnywhere ? advancePreGame : undefined}
                >
                    {/* LAYER 3: Global Safe Area (Red Box) - STRICT HEIGHT */}
                    <div style={{ 
                        width: `${contentWidth}%`, 
                        height: `${contentHeight}%`, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        boxSizing: 'border-box',
                        color: data.macrogame.globalStyling?.theme === 'light' ? '#333333' : '#ffffff',
                        textShadow: data.macrogame.globalStyling?.theme === 'light' ? 'none' : '2px 2px 4px rgba(0,0,0,0.6)',
                        cursor: canClickAnywhere ? 'pointer' : 'default',
                        ...globalGuideStyle
                    }}>
                        
                        {/* PADDING WRAPPER */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            paddingTop: `${preGame.paddingTop === '' ? 0 : (preGame.paddingTop ?? 0)}px`,
                            paddingBottom: `${preGame.paddingBottom === '' ? 0 : (preGame.paddingBottom ?? 0)}px`,
                            paddingLeft: `${preGame.paddingLeft === '' ? 0 : (preGame.paddingLeft ?? 0)}px`,
                            paddingRight: `${preGame.paddingRight === '' ? 0 : (preGame.paddingRight ?? 0)}px`,
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

                                {/* Top Spacer */}
                                <div style={{ flex: '1 1 auto', minHeight: data.macrogame.config.showProgress ? (data.macrogame.config.progressShowLabels ? 72 : 48) : 0 }}></div>

                                {/* TOP LAYER (TEXT) */}
                                <div className="custom-scrollbar" style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
                                    gap: `${preGame.textSpacing === '' ? 0 : (preGame.textSpacing ?? 16)}px`,
                                    flex: '0 1 auto', overflowY: 'auto', overflowX: 'hidden', minHeight: 0
                                }}>
                                    {preGame.headline && (
                                        <div className="link-content-wrapper ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ 
                                            __html: parseGameMergeTags(preGame.headline, activeGameData?.name, activeGameData?.controls) 
                                        }} />
                                    )}

                                    {preGame.bodyText && (
                                        <div className="link-content-wrapper ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ 
                                            __html: parseGameMergeTags(preGame.bodyText, activeGameData?.name, activeGameData?.controls) 
                                        }} />
                                    )}
                                </div>

                                {/* Gap */}
                                <div style={{ flexShrink: 0, height: `${preGame.blockSpacing === '' ? 0 : (preGame.blockSpacing ?? 32)}px` }} />

                                {/* BOTTOM LAYER (BUTTONS) */}
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', flexShrink: 0 }}>
                                    <TransitionRenderer 
                                        transition={transition} 
                                        onAdvance={advancePreGame} 
                                        isActive={data.isCountdownActive}
                                        showLayoutGuides={data.showLayoutGuides} 
                                        theme={data.macrogame.globalStyling?.theme || 'dark'} 
                                        defaultButtonText="Start"
                                    />
                                </div>

                                {/* Bottom Spacer */}
                                <div style={{ flex: '1 1 auto', minHeight: 0 }}></div>

                            </div>
                        </div>
                    </div>
                </div>
            );
        }       
        case 'promo': {
            return (
                <CanvasScreenRenderer 
                    config={{ ...data.macrogame.promoScreen, hasProgressTracker: data.macrogame.config.showProgress, hasProgressLabels: data.macrogame.config.progressShowLabels }}
                    isLightMode={isLightMode}
                    textStyles={textStyles}
                    contentWidth={contentWidth}
                    contentHeight={contentHeight}
                    globalGuideStyle={globalGuideStyle}
                    contentGuideStyle={contentGuideStyle}
                    structGuideStyle={structGuideStyle}
                    onAdvance={advanceFromPromo}
                    isActive={data.isCountdownActive}
                    showLayoutGuides={data.showLayoutGuides}
                    theme={data.macrogame.globalStyling?.theme || 'dark'}
                    altText="Promo Spotlight"
                    defaultButtonText="Continue"
                />
            );
        }
        case 'end': {
            const currentTheme = data.macrogame.globalStyling?.theme || 'dark';
            const isLight = currentTheme === 'light';

            if (data.macrogame.conversionScreenId) {
                const screen = data.allConversionScreens.find((s: ConversionScreen) => s.id === data.macrogame.conversionScreenId);
                return screen ? (
                    <ConversionScreenHost 
                        screen={screen} 
                        totalScore={totalScore} 
                        pointCosts={pointCosts} 
                        redeemPoints={redeemPoints} 
                        themeMode={currentTheme} 
                        overrideWidth={data.finalConversionWidth} 
                        contentHeight={data.contentHeight} 
                        showLayoutGuides={data.showLayoutGuides} 
                        hasProgressTracker={data.macrogame.config.showProgress}
                        hasProgressLabels={data.macrogame.config.progressShowLabels}
                        isActive={data.isCountdownActive}
                        playEventAudio={playEventAudio}
                        playClickAudio={playClickAudio}
                        playScreenTransitionAudio={playScreenTransitionAudio}
                        playTimerTickAudio={playTimerTickAudio}
                        playTimerGoAudio={playTimerGoAudio}
                    />
                ) : <div style={textStyles}><h2>Game Over!</h2><p>(Conversion screen missing or loading...)</p></div>;
            }
            return ( 
                <div style={{...textStyles, justifyContent: 'center' }}> 
                    <div style={{ width: `${contentWidth}%`, height: `${contentHeight}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...globalGuideStyle }}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...contentGuideStyle, padding: '2rem' }}>
                            <h2>Game Over!</h2>
                            <p style={{ fontSize: '1.2rem', maxWidth: '600px', lineHeight: 1.5, marginTop: '1rem', color: isLight ? '#666' : '#ccc' }}>
                                No Conversion Screen added yet.<br/>Assign one in the Macrogame Flow builder.
                            </p> 
                            {data.mode === 'simulation' && (
                                <button 
                                    onClick={() => start()} 
                                    style={{ marginTop: '1.5em', padding: '0.8em 1.5rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}
                                > 
                                    Restart Flow 
                                </button>
                            )} 
                        </div>
                    </div>
                </div> 
            );
        }
        
        default: return null;
    }
}

interface StaticMacrogamePreviewProps {
    macrogame: Macrogame;
    previewFocusTarget?: { view: string, index?: number, timestamp?: number };
    onEngineStateChange?: (state: { view: string, index: number }) => void;
    onThemeChange?: (theme: 'dark' | 'light') => void;
}

export const StaticMacrogamePreview: React.FC<StaticMacrogamePreviewProps> = ({ macrogame, previewFocusTarget, onEngineStateChange, onThemeChange }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const { allMicrogames, customMicrogames, allConversionScreens, allConversionMethods } = useData();

    // 1. HYDRATE MACROGAME DATA IN REAL-TIME
    const hydratedMacrogame = useMemo(() => {
        if (!macrogame) return null;

        const flowWithDetails = macrogame.flow.map((flowItem: any) => {
            const baseGame = allMicrogames.find(mg => mg.id === flowItem.microgameId);
            if (!baseGame) return null;
            
            const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
            const customSkinData = customVariant?.skinData || {};

            let definition = MICROGAME_DEFINITIONS[baseGame.id];
            const factoryRules = definition?.defaultRules || {};
            const variantRules = customVariant?.rules || {};

            // --- PHASE 3: MACROGAME ECONOMY OVERRIDE ---
            // The Macrogame is the ultimate authority. If the point system is ON at the macro level, 
            // it forces all microgames to participate and override their local point settings.
            const isMacroEconomyActive = macrogame?.config?.showPoints === true;

            const mergedRules = {
                ...factoryRules,
                ...variantRules,
                enablePoints: isMacroEconomyActive ? true : (variantRules.enablePoints ?? factoryRules.enablePoints ?? false),
                showScore: isMacroEconomyActive ? true : (variantRules.showScore ?? factoryRules.showScore ?? false),
                scores: { 
                    ...(factoryRules.scores || {}), 
                    ...(variantRules.scores || {}),
                    ...(flowItem.pointRules || {}) // Macrogame economy ultimate authority on point values
                },
                winCondition: { ...(factoryRules.winCondition || {}), ...(variantRules.winCondition || {}), ...(flowItem.winCondition || {}) },
                lossCondition: { ...(factoryRules.lossCondition || {}), ...(variantRules.lossCondition || {}), ...(flowItem.lossCondition || {}) }
            };

            const mergedMechanics = {
                ...(baseGame.mechanics || {}),
                ...(customVariant?.mechanics || {})
            };

            const gameName = customVariant ? customVariant.name : baseGame.name;

            return { ...baseGame, ...flowItem, name: gameName, customSkinData, rules: mergedRules, mechanics: mergedMechanics };
        }).filter(Boolean);

        return { ...macrogame, flow: flowWithDetails as any[] };
    }, [macrogame, allMicrogames, customMicrogames]);

    // 2. INITIALIZE ENGINE
    const engine = useMacroGameEngine(hydratedMacrogame as Macrogame);
    const [runId, setRunId] = useState(0);

    const [isPaused, setIsPaused] = useState(false);
    const [showLayoutGuides, setShowLayoutGuides] = useState(false);
    const [resultViewMode, setResultViewMode] = useState<'win' | 'loss' | 'try_again'>('win');

    // --- GLOBAL COUNTDOWN TESTER STATE ---
    const [countdownState, setCountdownState] = useState<'idle' | 'playing' | 'paused'>('idle');
    const [countdownKey, setCountdownKey] = useState(0);

    // Wipe tester state clean if the user navigates to a new screen
    useEffect(() => {
        setCountdownState('idle');
        setCountdownKey(k => k + 1);
    }, [engine.view, engine.currentFlowIndex]);

    const isCountdownActive = engine.mode === 'simulation' || countdownState === 'playing';

    // Safely hoist derived data BEFORE the hook to prevent Temporal Dead Zone (TDZ) Reference Errors
    const linkedScreen = hydratedMacrogame ? allConversionScreens.find((s: ConversionScreen) => s.id === hydratedMacrogame.conversionScreenId) : undefined;
    const freshGameData = engine.activeGameData ? (hydratedMacrogame?.flow[engine.currentFlowIndex] || engine.activeGameData) : null;
    const activePreGameConfig = (freshGameData as any)?.preGameConfig || hydratedMacrogame?.config?.preGameConfig;
    const activeResultConfig = (freshGameData as any)?.resultConfig || hydratedMacrogame?.config?.resultConfig;

    // Scan the current screen to see if a countdown exists so we know whether to render the tester UI
    const currentHasCountdown = useMemo(() => {
        if (!hydratedMacrogame) return false;
        if (engine.view === 'intro') return hydratedMacrogame.introScreen.transition?.type === 'auto';
        if (engine.view === 'promo') return hydratedMacrogame.promoScreen.transition?.type === 'auto';
        if (['title', 'controls', 'combined'].includes(engine.view)) return activePreGameConfig?.transition?.type === 'auto';
        if (engine.view === 'game' && engine.isOverlayVisible) return activePreGameConfig?.transition?.type === 'auto';
        if (engine.view === 'result') return activeResultConfig?.transition?.type === 'auto' && resultViewMode !== 'try_again';
        if (engine.view === 'end' && linkedScreen) {
            return linkedScreen.methods.some((m: any) => {
                const mData = allConversionMethods.find((glob: any) => glob.id === m.methodId);
                return mData && (String(mData.type).toLowerCase().includes('link') || String(mData.type).toLowerCase().includes('redirect')) && (mData as any).transition?.type === 'auto';
            });
        }
        return false;
    }, [hydratedMacrogame, engine.view, engine.isOverlayVisible, activePreGameConfig, activeResultConfig, resultViewMode, linkedScreen, allConversionMethods]);

    // --- CONSOLIDATED UI LOGIC FLAGS ---
    const isPreGameScreen = ['title', 'controls', 'combined'].includes(engine.view) || (engine.view === 'game' && engine.isOverlayVisible);
    const isGameActive = engine.view === 'game' && !engine.isOverlayVisible;
    const isGameFinished = engine.view === 'game' && engine.result !== null;

    const showPlayPause = currentHasCountdown || (isGameActive && !isGameFinished);
    const showRestart = isGameActive || isGameFinished || (currentHasCountdown && countdownState !== 'idle');

    // Auto-correct the resultViewMode if the user navigates to a game where the current mode is impossible
    useEffect(() => {
        if (engine.view === 'result' && hydratedMacrogame?.flow[engine.currentFlowIndex]) {
            const gameData = hydratedMacrogame.flow[engine.currentFlowIndex];
            const wType = gameData.winCondition?.type || 'time';
            const lType = gameData.lossCondition?.type || 'none';
            const cLose = lType !== 'none';
            const cTryAgain = wType !== 'time' && lType !== 'failure';

            if (resultViewMode === 'loss' && !cLose) {
                setResultViewMode('win');
            } else if (resultViewMode === 'try_again' && !cTryAgain) {
                setResultViewMode('win');
            }
        }
    }, [engine.view, engine.currentFlowIndex, hydratedMacrogame, resultViewMode]);

    // Watch for physical changes to the Macrogame Flow structure (Add/Remove games)
    const flowSignature = hydratedMacrogame?.flow.map(f => f.microgameId).join(',');
    useEffect(() => {
        // If the admin swaps, adds, or removes games, wipe the score to prevent ghost points
        engine.resetScore();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flowSignature]);

    // Auto-unpause if the view changes out of 'game'
    useEffect(() => {
        if (engine.view !== 'game') setIsPaused(false);
    }, [engine.view]);

    const handleRestart = useCallback(() => {
        setRunId(c => c + 1);
        setIsPaused(false); // Clear pause state
        setCountdownState('idle'); // Reset countdown state
        setCountdownKey(k => k + 1); // Remount countdown visuals
        
        // If we are on any part of the microgame flow, restart just the current game to its pre-game state
        if (engine.view === 'game' || ['title', 'controls', 'combined', 'result'].includes(engine.view)) {
            const flowType = hydratedMacrogame?.config.screenFlowType || 'Separate';
            const targetView = flowType === 'Separate' ? 'title' : (flowType === 'Combined' ? 'combined' : 'game');
            // Pass 'true' to force the engine to reset the overlay state even if the view stays 'game'
            engine.jumpTo(targetView, engine.currentFlowIndex, true);
        } else {
            // For Intro, Promo, and End screens, seamlessly remount the current screen
            engine.jumpTo(engine.view, engine.currentFlowIndex, true);
        }
    }, [engine, hydratedMacrogame]);

    const handleJumpToFirst = useCallback(() => {
        if (!hydratedMacrogame) return;
        const flowType = hydratedMacrogame.config.screenFlowType || 'Separate';
        let targetView = 'end';
        if (hydratedMacrogame.introScreen.enabled) targetView = 'intro';
        else if (hydratedMacrogame.flow.length > 0) targetView = flowType === 'Separate' ? 'title' : (flowType === 'Combined' ? 'combined' : 'game');
        else if (hydratedMacrogame.promoScreen.enabled) targetView = 'promo';
        engine.jumpTo(targetView, 0);
    }, [engine, hydratedMacrogame]);

    const handleJumpToLast = useCallback(() => {
        engine.jumpTo('end', 0);
    }, [engine]);

    useEffect(() => {
        // Start engine automatically when the preview mounts.
        // We removed runId from the dependencies so that restarting a single microgame 
        // doesn't accidentally trigger a full macrogame reset back to the intro screen.
        engine.start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- SMART JUMP EFFECT ---
    useEffect(() => {
        // ONLY jump if a timestamp is provided (indicating a manual click from the parent)
        if (!previewFocusTarget || !previewFocusTarget.timestamp) return;

        const targetView = previewFocusTarget.view;
        const targetIndex = previewFocusTarget.index || 0;

        engine.setMode('inspection');
        engine.jumpTo(targetView, targetIndex);
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewFocusTarget.timestamp]);

    // --- TWO-WAY BINDING: UPDATE PARENT WHEN ENGINE MOVES ---
    const onEngineStateChangeRef = useRef(onEngineStateChange);
    useEffect(() => {
        onEngineStateChangeRef.current = onEngineStateChange;
    }, [onEngineStateChange]);

    useEffect(() => {
        // Ignore the internal 'loading' state to prevent flickering back to it
        if (onEngineStateChangeRef.current && engine.view !== 'loading') {
            onEngineStateChangeRef.current({ view: engine.view, index: engine.currentFlowIndex });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine.view, engine.currentFlowIndex]);

    // 3. RESPONSIVE SCALING
    const currentSize = ORIENTATIONS[orientation];
    const calculateLayout = useCallback(() => {
        if (wrapperRef.current) {
            const padding = 20; 
            const availableWidth = wrapperRef.current.offsetWidth - padding;
            const availableHeight = wrapperRef.current.offsetHeight - padding;
            setScale(Math.min(availableWidth / currentSize.width, availableHeight / currentSize.height));
        }
    }, [currentSize]);

    useEffect(() => {
        const observer = new ResizeObserver(calculateLayout);
        if (wrapperRef.current) observer.observe(wrapperRef.current);
        calculateLayout();
        return () => observer.disconnect();
    }, [calculateLayout]);

    // 4. MICROGAME HUD STATE
    const [hudState, setHudState] = useState({ lives: null, maxLives: null, goalCurrent: null, goalTarget: null, timerProgress: 100 });
    useEffect(() => { setHudState({ lives: null, maxLives: null, goalCurrent: null, goalTarget: null, timerProgress: 100 }); }, [engine.activeGameData, runId]);
    const handleUpdateHUD = useCallback((payload: any) => setHudState(prev => ({ ...prev, ...payload })), []);

    // 5. RENDER LOGIC
    if (!hydratedMacrogame) return <div style={{...styles.centerContent, color: 'white'}}>Loading Data...</div>;

    // The Macrogame's global styling is the absolute source of truth for layout boundaries
    const contentWidth = hydratedMacrogame.globalStyling?.width ?? 50;
    const contentHeight = hydratedMacrogame.globalStyling?.height ?? 100;

    // Exclude 'title' so the engine properly routes stand-alone pre-game screens to the StaticScreen fallback
    const showGameView = ['game', 'result'].includes(engine.view) && !!engine.activeGameData;

    const activeGameId = engine.activeGameData?.id;
    const ActiveMicrogame = activeGameId ? MICROGAME_COMPONENTS[activeGameId] : null;

    const activeWinType = (freshGameData as any)?.winCondition?.type || 'time';
    const activeLossType = (freshGameData as any)?.lossCondition?.type || 'none';
    const activeCanLose = activeLossType !== 'none';
    const activeCanTryAgain = activeWinType !== 'time' && activeLossType !== 'failure';

    let content: React.ReactNode = null;
    let microConfig = { showPoints: false, lifeIconType: 'heart' as any };
    let goalLabel: string | undefined;

    if (showGameView && ActiveMicrogame && engine.activeGameData && freshGameData) {
        const rules = (freshGameData as any).rules || {};
        const skinConfig = (freshGameData as any).customSkinData || {};
        const mechanics = (freshGameData as any).mechanics || {};
        
        // Use the dropdown override if we are in inspection mode, otherwise use real game result
        const resultType = engine.mode === 'inspection' ? resultViewMode : ((engine.result as any)?.type || (engine.result?.win ? 'win' : 'loss'));
        const winType = rules?.winCondition?.type;
        goalLabel = winType === 'quota' ? "Items Caught" : winType === 'score' ? "Points Earned" : undefined;

        microConfig = {
            showPoints: rules.enablePoints && rules.showScore,
            lifeIconType: (engine.activeGameData as any).hud?.lifeIcon || 'heart'
        };

        const isStandAloneResult = engine.view === 'result' && activeResultConfig?.format === 'stand_alone';

        content = (
            <>
                {!isStandAloneResult && (
                    <ActiveMicrogame 
                        key={`${engine.gameKey}-${runId}-${engine.currentGameIndex}`} 
                        onEnd={engine.onGameEnd} 
                        onReportEvent={engine.onReportEvent}
                        onUpdateHUD={handleUpdateHUD} 
                        skinConfig={skinConfig} 
                        gameData={engine.activeGameData} 
                        rules={rules}
                        mechanics={mechanics} 
                        isOverlayVisible={engine.isOverlayVisible} 
                        hideOverlayVisuals={true} 
                        onInteraction={engine.onInteraction}
                        // Halt the internal render loop immediately when a result is registered (Freezes animations/timer)
                        isPlaying={engine.view === 'game' && !engine.isOverlayVisible && !isPaused && !engine.result}
                    />
                )}

                {engine.view === 'result' && (activeResultConfig?.enabled ?? true) && (() => {
                    const resultConfig = activeResultConfig;
                    let canRetry = false;
                    if (resultConfig) {
                        if (resultType === 'win' && resultConfig.showPlayAgainOnWin) canRetry = true;
                        if (resultType === 'loss' && resultConfig.showPlayAgainOnLoss) canRetry = true;
                        if (resultType === 'try_again') canRetry = true; // Always allow retry on 'Try Again' state
                    }

                    return (
                        <MicrogameResultOverlay 
                            key={`result-${engine.currentFlowIndex}-${countdownKey}`}
                            type={resultType as any}
                            score={engine.totalScore}
                            showScore={rules.enablePoints && rules.showScore}
                            onContinue={engine.continueFlow}
                            onRetry={canRetry ? engine.retryCurrentMicrogame : undefined}
                            config={resultConfig}
                            macroConfig={hydratedMacrogame.config}
                            theme={hydratedMacrogame.globalStyling?.theme}
                            contentWidth={contentWidth}
                            contentHeight={contentHeight}
                            showLayoutGuides={showLayoutGuides}
                            isStandAlone={isStandAloneResult}
                            isActive={isCountdownActive}
                            scoreLedger={engine.scoreLedger}
                            currentGameIndex={engine.currentFlowIndex}
                            playScoreTallyAudio={engine.playScoreTallyAudio}
                        />
                    );
                })()}
            </>
        );
    } else {
        const syncWidth = hydratedMacrogame.config.conversionScreenConfig?.syncWidth !== false;
        const finalConversionWidth = syncWidth ? contentWidth : (hydratedMacrogame.config.conversionScreenConfig?.customWidth ?? 100);

        const dataForStaticScreen = { macrogame: hydratedMacrogame, allConversionScreens, mode: engine.mode, showLayoutGuides, contentWidth, contentHeight, finalConversionWidth, isCountdownActive };
        content = <StaticScreen key={`static-${engine.view}-${countdownKey}`} {...engine} data={dataForStaticScreen} handleRestart={handleRestart} totalScore={engine.totalScore} pointCosts={hydratedMacrogame.pointCosts || {}} redeemPoints={engine.redeemPoints} playEventAudio={engine.playEventAudio} playClickAudio={engine.playClickAudio} playScreenTransitionAudio={engine.playScreenTransitionAudio} playTimerTickAudio={engine.playTimerTickAudio} playTimerGoAudio={engine.playTimerGoAudio} />;
    }

    const fontType = hydratedMacrogame.globalStyling?.fontType || 'standard';
    
    // We isolate the preview from syntax errors. If custom, we strictly use our internal name.
    // If google/standard, we strip semicolons so a typo doesn't crash the React inline style.
    const activeFontFamily = (fontType === 'custom' && hydratedMacrogame.globalStyling?.customFontUrl)
        ? "'PreviewCustomFont', sans-serif" 
        : (hydratedMacrogame.globalStyling?.fontFamily?.replace(/;/g, '') || 'system-ui, sans-serif');

    return (
       <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {fontType === 'google' && hydratedMacrogame.globalStyling?.googleFontUrl && (
                <link href={hydratedMacrogame.globalStyling.googleFontUrl} rel="stylesheet" />
            )}
            
            <style>{quillCssBlock}</style>
            <style>{`
                /* Clean custom scrollbars for content boxes */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(150, 150, 150, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(150, 150, 150, 0.8);
                }

                ${(fontType === 'custom' && hydratedMacrogame.globalStyling?.customFontUrl) ? `
                    @font-face {
                        font-family: 'PreviewCustomFont'; 
                        src: url('${hydratedMacrogame.globalStyling.customFontUrl}');
                        font-display: swap;
                    }
                ` : ''}

                /* FORCE all Quill text blocks to obey the Macrogame font, overriding Helvetica */
                .ql-editor, .ql-editor p, .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor span {
                    font-family: ${activeFontFamily} !important;
                }

                @keyframes pulse {
                    0% { opacity: 0.6; transform: scale(0.98); }
                    50% { opacity: 1; transform: scale(1.02); }
                    100% { opacity: 0.6; transform: scale(0.98); }
                }
            `}</style>

            {/* Toolbar */}
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h5 style={{ margin: 0, color: '#333', fontSize: '1rem', whiteSpace: 'nowrap' }}>Live Preview</h5>
                        <span style={{ color: '#666', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>• {engine.progressText || engine.view}</span>
                    </div>
                    
                    {/* Mode Switcher & Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e9ecef', padding: '3px', borderRadius: '6px' }}>
                        <button 
                            onClick={() => engine.setMode('simulation')} 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: engine.mode === 'simulation' ? '#fff' : 'transparent', color: engine.mode === 'simulation' ? '#0866ff' : '#666', fontWeight: engine.mode === 'simulation' ? 'bold' : 'normal', boxShadow: engine.mode === 'simulation' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                        >
                            Simulation
                        </button>
                        <button 
                            onClick={() => engine.setMode('inspection')} 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: engine.mode === 'inspection' ? '#fff' : 'transparent', color: engine.mode === 'inspection' ? '#0866ff' : '#666', fontWeight: engine.mode === 'inspection' ? 'bold' : 'normal', boxShadow: engine.mode === 'inspection' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                        >
                            Inspection
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '0.5rem', borderLeft: '1px solid #ccc', paddingLeft: '0.5rem' }}>
                            <button onClick={handleJumpToFirst} disabled={!engine.canStepBackward} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px 0 0 4px', cursor: engine.canStepBackward ? 'pointer' : 'not-allowed', color: '#333', opacity: engine.canStepBackward ? 1 : 0.5 }} title="Skip to First">&laquo;</button>
                            <button onClick={engine.stepBackward} disabled={!engine.canStepBackward} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', border: '1px solid #ccc', borderLeft: 'none', backgroundColor: '#fff', borderRadius: '0', cursor: engine.canStepBackward ? 'pointer' : 'not-allowed', color: '#333', opacity: engine.canStepBackward ? 1 : 0.5 }}>&larr; Prev</button>
                            <button onClick={engine.stepForward} disabled={!engine.canStepForward} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', border: '1px solid #ccc', borderLeft: 'none', backgroundColor: '#fff', borderRadius: '0', cursor: engine.canStepForward ? 'pointer' : 'not-allowed', color: '#333', opacity: engine.canStepForward ? 1 : 0.5 }}>Next &rarr;</button>
                            <button onClick={handleJumpToLast} disabled={!engine.canStepForward} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', border: '1px solid #ccc', borderLeft: 'none', backgroundColor: '#fff', borderRadius: '0 4px 4px 0', cursor: engine.canStepForward ? 'pointer' : 'not-allowed', color: '#333', opacity: engine.canStepForward ? 1 : 0.5 }} title="Skip to Last">&raquo;</button>
                        </div>
                    </div>
                </div>

                {/* Second Line: Actions and Mode Selector */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: '#555', fontWeight: 500 }}>
                            <input type="checkbox" checked={showLayoutGuides} onChange={(e) => setShowLayoutGuides(e.target.checked)} />
                            Show Layout Guides
                        </label>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #ccc', paddingLeft: '1rem' }}>
                            {/* TODO: Restore orientation selector in a later phase when adding mobile support 
                            <select value={orientation} onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', borderColor: '#ccc', backgroundColor: '#fff', color: '#333', fontSize: '0.85rem', cursor: 'pointer' }}>
                                <option value="landscape">Landscape (16:9)</option>
                                <option value="portrait">Portrait (9:16)</option>
                            </select>
                            */}

                            {engine.mode === 'inspection' && (showPlayPause || showRestart) && (
                                <>
                                    {showPlayPause && (
                                        <button 
                                            onClick={() => {
                                                if (currentHasCountdown) {
                                                    setCountdownState(countdownState === 'playing' ? 'paused' : 'playing');
                                                } else if (isGameActive) {
                                                    setIsPaused(!isPaused);
                                                }
                                            }} 
                                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: (currentHasCountdown ? countdownState === 'playing' : !isPaused) ? '#f1c40f' : '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}
                                        >
                                            {currentHasCountdown ? (countdownState === 'playing' ? 'Pause' : 'Play') : (isPaused ? 'Play' : 'Pause')}
                                        </button>
                                    )}

                                    {showRestart && (
                                        <button 
                                            onClick={handleRestart} 
                                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#0866ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Restart {(isGameActive || isGameFinished || isPreGameScreen) ? 'Game' : 'Screen'}
                                        </button>
                                    )}
                                </>
                            )}

                            {engine.view === 'result' && engine.mode === 'inspection' && (
                                <select 
                                    value={resultViewMode} 
                                    onChange={(e) => setResultViewMode(e.target.value as 'win' | 'loss' | 'try_again')} 
                                    style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', borderColor: '#ccc', backgroundColor: '#fff', color: '#333', fontSize: '0.85rem', cursor: 'pointer' }}
                                >
                                    <option value="win">Preview Win State</option>
                                    {activeCanLose && <option value="loss">Preview Loss State</option>}
                                    {activeCanTryAgain && <option value="try_again">Preview Try Again State</option>}
                                </select>
                            )}

                            {engine.mode === 'simulation' && (
                                <button 
                                    onClick={() => {
                                        setRunId(c => c + 1);
                                        setIsPaused(false);
                                        setCountdownState('idle');
                                        setCountdownKey(k => k + 1);
                                        engine.start();
                                    }} 
                                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Restart Flow
                                </button>
                            )}
                        </div>

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>Mode:</span>
                        <select 
                            value={hydratedMacrogame.globalStyling?.theme || 'dark'}
                            onChange={(e) => onThemeChange && onThemeChange(e.target.value as 'dark' | 'light')}
                            style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', borderColor: '#ccc', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: '#fff' }}
                        >
                            <option value="dark">Dark (Default)</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div ref={wrapperRef} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e9ecef', borderRadius: '0 0 8px 8px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', 
                    width: currentSize.width, 
                    height: currentSize.height,
                    transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden',
                    
                    // --- INHERITED GLOBAL STYLES (Layer 1: Bezel/Frame) ---
                    backgroundColor: hydratedMacrogame.globalStyling?.theme === 'light' ? '#ffffff' : '#1a1a2e',
                    fontFamily: activeFontFamily,
                    borderRadius: hydratedMacrogame.globalStyling?.borderRadius ?? 8,
                    paddingTop: hydratedMacrogame.globalStyling?.paddingTop ?? 0,
                    paddingBottom: hydratedMacrogame.globalStyling?.paddingBottom ?? 0,
                    paddingLeft: hydratedMacrogame.globalStyling?.paddingLeft ?? 0,
                    paddingRight: hydratedMacrogame.globalStyling?.paddingRight ?? 0,
                    boxSizing: 'border-box'
                }}>
                    {/* Layer 2: Inner boundary */}
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit' }}>
                        <UnifiedGameChrome
                            key={`chrome-${engine.view}-${engine.currentFlowIndex}-${countdownKey}`}
                            view={engine.view}
                            theme={hydratedMacrogame.globalStyling?.theme}
                            macroConfig={{
                                showPoints: hydratedMacrogame.config.showPoints ?? false,
                                showProgress: hydratedMacrogame.config.showProgress ?? false,
                                progressFormat: (hydratedMacrogame.config as any).progressFormat || 'visual',
                                progressShowLabels: (hydratedMacrogame.config as any).progressShowLabels ?? false,
                                hasIntro: hydratedMacrogame.introScreen?.enabled ?? false,
                                hasPromo: hydratedMacrogame.promoScreen?.enabled ?? false,
                                hudLayout: hydratedMacrogame.globalStyling?.hudLayout,
                                hudPaddingY: hydratedMacrogame.globalStyling?.hudPaddingY,
                                hudPaddingX: hydratedMacrogame.globalStyling?.hudPaddingX
                            }}
                            totalScore={engine.totalScore}
                            progressText={engine.progressText}
                            currentStep={engine.currentGameIndex}
                            totalSteps={engine.totalGamesInFlow}
                            microConfig={microConfig}
                            lives={hudState.lives}
                            maxLives={hudState.maxLives}
                            timerProgress={hudState.timerProgress}
                            goalCurrent={hudState.goalCurrent}
                            goalTarget={hudState.goalTarget}
                            goalLabel={goalLabel}
                            isOverlayVisible={engine.isOverlayVisible}
                            onStart={engine.onInteraction}
                            overlayTitle={engine.activeGameData?.name}
                            overlayControls={engine.activeGameData?.controls}
                            preGameConfig={activePreGameConfig}
                            contentWidth={contentWidth}
                            contentHeight={contentHeight}
                            showLayoutGuides={showLayoutGuides}
                            isActive={isCountdownActive}
                        >
                            {content}
                        </UnifiedGameChrome>
                    </div>
                </div>
            </div>
        </div>
    );
};