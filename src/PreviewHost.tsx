// src/PreviewHost.tsx

import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { DeliveryContainer, Macrogame, UISkin, Microgame as MicrogameData, MicrogameResult, ScreenConfig } from '../types';
import { UI_SKINS } from './constants';
import { MICROGAME_DEFINITIONS } from './microgames/definitions/index';
import { useMacroGameEngine } from './hooks/useMacroGameEngine';
import { UnifiedGameChrome } from './components/ui/UnifiedGameChrome';
import { microgames } from './microgames';
import { MicrogameResultOverlay } from './components/ui/MicrogameResultOverlay';
import { preloadMicrogames } from './microgames/preloader';
import { preloadImages, parseGameMergeTags } from './utils/helpers';
import { ConversionScreenHost } from './components/conversions/ConversionScreenHost';
import { TransitionRenderer } from './components/builders/macrogame/TransitionRenderer';
import { useDebouncedResize } from './utils/helpers';
import ClassicHandheldSkin from './skins/ClassicHandheld';
import ModernHandheldSkin from './skins/ModernHandheld';
import TabletSkin from './skins/Tablet';
import BarebonesSkin from './skins/Barebones';
import ConfigurablePopupSkin from './skins/ConfigurablePopup';
import ConfigurablePopupLiveSkin from './skins/ConfigurablePopupLive';
import { useData } from './hooks/useData';

const skinRegistry: { [key: string]: React.FC<any> } = {
  'classic-handheld': ClassicHandheldSkin,
  'modern-handheld': ModernHandheldSkin,
  'tablet': TabletSkin,
  'barebones': BarebonesSkin,
  'configurable-popup': ConfigurablePopupSkin,
  'configurable-popup-live': ConfigurablePopupLiveSkin,
};

// --- NEW: Sleek Auto-Transition Countdown Overlay ---
const AutoTransitionOverlay: React.FC<{ delaySeconds: number }> = ({ delaySeconds }) => {
    const [timeLeft, setTimeLeft] = useState(delaySeconds);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    if (delaySeconds === 0) return null; // Don't flash if delay is 0

    return (
        <div style={{
            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'white', zIndex: 998, backdropFilter: 'blur(3px)', fontFamily: 'inherit'
        }}>
            <div style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Continuing in...
            </div>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', lineHeight: 1, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                {timeLeft}
            </div>
        </div>
    );
};

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
}> = ({ view, data, activeGameData, result, handleRestart, advanceFromIntro, advanceFromPromo, advancePreGame, totalScore, pointCosts, redeemPoints, playEventAudio, playClickAudio, playScreenTransitionAudio, playTimerTickAudio, playTimerGoAudio }) => {

    const textStyles: React.CSSProperties = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', textAlign: 'center', fontFamily: data.skin.fontFamily || 'sans-serif', textShadow: '2px 2px 4px rgba(0,0,0,0.6)', padding: '1.5em', boxSizing: 'border-box', backgroundSize: 'cover', backgroundPosition: 'center' };

    switch (view) {
        case 'intro': {
            const introConfig = data.macrogame.introScreen;
            const introStyle = { ...textStyles, ...(introConfig.backgroundImageUrl && { backgroundImage: `url("${introConfig.backgroundImageUrl}")` }), ...(introConfig.clickToContinue && { cursor: 'pointer' }) };
            return ( <div style={introStyle} onClick={introConfig.clickToContinue ? advanceFromIntro : undefined}> <h1 style={{ fontSize: '2.8em' }}>{introConfig.text}</h1> {introConfig.clickToContinue && ( <p style={{ marginTop: '1.5em', fontSize: '1.4em', background: 'rgba(0,0,0,0.7)', padding: '0.5em 0.8em', borderRadius: '5px' }}> Click to continue </p> )} </div> );
        }
        case 'title':
        case 'controls':
        case 'combined': {
            const activePreGameConfig = (activeGameData as any)?.preGameConfig || data.macrogame.config.preGameConfig || {};
            const transition = activePreGameConfig.transition || {};
            const isAuto = (transition.type || 'interact') === 'auto';
            const interactionMethod = transition.interactionMethod || 'click';
            const clickFormat = transition.clickFormat || 'disclaimer';
            const isButton = !isAuto && interactionMethod === 'click' && clickFormat === 'button';
            const canClickAnywhere = !isAuto && !isButton;

            // Optional 3-tier layout guides for deep debugging in prod
            const globalGuideStyle: React.CSSProperties = data.showLayoutGuides ? { outline: '2px solid rgba(255, 0, 0, 0.8)', outlineOffset: '-2px' } : {};
            const contentGuideStyle: React.CSSProperties = data.showLayoutGuides ? { outline: '2px dotted rgba(255, 193, 7, 0.9)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 193, 7, 0.15)', boxSizing: 'border-box' } : {};

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
                                <div style={{ flex: '1 1 auto', minHeight: activeMacrogame.config.showProgress ? (activeMacrogame.config.progressShowLabels ? 72 : 48) : 0 }}></div>

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
                                        isActive={true} 
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
            const promoConfig = data.macrogame.promoScreen as ScreenConfig;
            const promoBaseStyle: React.CSSProperties = { ...textStyles, ...(promoConfig.backgroundImageUrl && { backgroundImage: `url("${promoConfig.backgroundImageUrl}")` }), ...(!promoConfig.backgroundImageUrl && { backgroundColor: '#1a1a2e' }), ...(promoConfig.clickToContinue && { cursor: 'pointer' }) };
            
            const layout = promoConfig.spotlightImageLayout;
            const contentContainerStyle: React.CSSProperties = { display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '1em' };
            if (layout === 'left') contentContainerStyle.flexDirection = 'row';
            if (layout === 'right') contentContainerStyle.flexDirection = 'row-reverse';
            if (layout === 'top') contentContainerStyle.flexDirection = 'column';
            if (layout === 'bottom') contentContainerStyle.flexDirection = 'column-reverse';

            const imageStyle: React.CSSProperties = { objectFit: 'cover', borderRadius: '8px', };
            if (layout === 'left' || layout === 'right') {
                imageStyle.width = '40%';
                imageStyle.height = '70%';
            } else { // top or bottom
                imageStyle.width = '70%';
                imageStyle.height = '40%';
            }

            return (
                <div style={promoBaseStyle} onClick={promoConfig.clickToContinue ? advanceFromPromo : undefined}>
                    <div style={contentContainerStyle}>
                        {promoConfig.spotlightImageUrl && <img src={promoConfig.spotlightImageUrl} style={imageStyle} alt="Promo" />}
                        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: '1em', borderRadius: '8px' }}>
                            <h1 style={{ fontSize: '2.2em' }}>{promoConfig.text}</h1>
                        </div>
                    </div>
                    {promoConfig.clickToContinue && ( <p style={{ position: 'absolute', bottom: '1em', fontSize: '1.4em', background: 'rgba(0,0,0,0.7)', padding: '0.5em 0.8em', borderRadius: '5px' }}> Click to continue </p> )}
                </div>
            );
        }
        case 'end': {
            if (data.macrogame.conversionScreenId) {
                const screen = data.allConversionScreens.find((s: ConversionScreen) => s.id === data.macrogame.conversionScreenId);
                const currentTheme = data.macrogame.globalStyling?.theme || 'dark';
                return screen ? (
                    <ConversionScreenHost 
                        screen={screen} 
                        totalScore={totalScore} 
                        pointCosts={pointCosts} 
                        redeemPoints={redeemPoints} 
                        themeMode={currentTheme} 
                        overrideWidth={data.finalConversionWidth} 
                        contentHeight={data.contentHeight} 
                        hasProgressTracker={data.macrogame.config.showProgress}
                        hasProgressLabels={data.macrogame.config.progressShowLabels}
                        playEventAudio={playEventAudio}
                        playClickAudio={playClickAudio}
                        playScreenTransitionAudio={playScreenTransitionAudio}
                        playTimerTickAudio={playTimerTickAudio}
                        playTimerGoAudio={playTimerGoAudio}
                    />
                ) : <div style={textStyles}><h2>Game Over!</h2><p>(Error: Configured conversion screen not found)</p></div>;
            }
            return ( <div style={{...textStyles, justifyContent: 'center' }}> <h2>Game Over!</h2> <p>(No conversion screen was configured)</p> <button onClick={handleRestart} style={{ marginTop: '1.5em', padding: '0.8em', background: '#4CAF50', color: 'white', border: 'none' }}> Play Again </button> </div> );
        }
        
        default: return null;
    }
}

const PreviewHost: React.FC = () => {
    const { macrogames, allConversionScreens, allMicrogames, customMicrogames } = useData();
    useDebouncedResize();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [gameAreaFontSize, setGameAreaFontSize] = useState(16);
    const [previewConfig, setPreviewConfig] = useState<any | null>(null);
    const [activeMacrogame, setActiveMacrogame] = useState<Macrogame | null>(null);
    const [activeSkin, setActiveSkin] = useState<UISkin | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [runId, setRunId] = useState(0);

    const engine = useMacroGameEngine(activeMacrogame);

    // --- Local State for Microgame HUD ---
    const [hudState, setHudState] = useState<{
    lives: number | null;
    maxLives: number | null;
    goalCurrent: number | null;
    goalTarget: number | null;
    timerProgress: number;
}>({ lives: null, maxLives: null, goalCurrent: null, goalTarget: null, timerProgress: 100 });
    
    useEffect(() => {
        try {
            const rawData = localStorage.getItem('macrogame_preview_data');
            if (!rawData) throw new Error("No preview data found.");
            setPreviewConfig(JSON.parse(rawData));
        } catch (e: any) { setError(e.message); }
    }, []);

    // --- UPDATED Hydration Logic ---
    useEffect(() => {
        if (!previewConfig) return;

        let macrogameToPreview: Macrogame | undefined;

        // PRIORITY 1: Use the full macrogame object from the preview config
        if (previewConfig.macrogame) {
            macrogameToPreview = previewConfig.macrogame as Macrogame;
        } 
        // PRIORITY 2: Fallback to ID lookup
        else if (macrogames.length > 0) {
            macrogameToPreview = macrogames.find(m => m.id === previewConfig.macrogameId);
        } else {
            return; // Wait for macrogames to load
        }
        
        const foundSkin = UI_SKINS.find(s => s.id === previewConfig.skinId);
        if (!macrogameToPreview || !foundSkin) {
            // Only show error if we are sure data is loaded but missing
            if (macrogames.length > 0) {
                setError("Could not find the macrogame or UI skin for the preview.");
                setIsLoading(false);
            }
            return;
        }

        // Hydrate flow with full microgame details
        const flowWithDetails = macrogameToPreview.flow.map((flowItem: any) => {
            if (flowItem.baseType) return flowItem; 
            
            const baseGame = allMicrogames.find(mg => mg.id === flowItem.microgameId);
            if (!baseGame || baseGame.isActive === false) return null;
            
            const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
            
            // --- ROBUST SKIN HYDRATION ---
            // 1. Try to get skin data from the loaded variant (Library/Manager)
            let sourceSkinData = customVariant?.skinData || {};
            
            // 2. If that's empty, fall back to the flow item's inline data (Single Game Preview)
            if (Object.keys(sourceSkinData).length === 0 && flowItem.customSkinData) {
                sourceSkinData = flowItem.customSkinData;
            }

            const customSkinData = Object.keys(sourceSkinData).reduce((acc: any, key: string) => { 
                const item = sourceSkinData[key];
                // Pass the full object so width/height/hitboxScale are preserved
                acc[key] = item; 
                return acc; 
            }, {});

            // 2. Resolve Rules
            let definition = MICROGAME_DEFINITIONS[baseGame.id];
            if (!definition) {
                const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === baseGame.id.toLowerCase());
                if (key) definition = MICROGAME_DEFINITIONS[key];
            }
            
            // Build Rules Object
            const eventDefaultScores: { [key: string]: number } = {};
            if (definition?.events) {
                Object.entries(definition.events).forEach(([key, def]) => {
                    if ((def as any).canScore && (def as any).defaultPoints) {
                        eventDefaultScores[key] = (def as any).defaultPoints;
                    }
                });
            }

            const factoryRules = definition?.defaultRules || {};
            const variantRules = customVariant?.rules || {};
            const previewRules = flowItem.rules || {};

            const resolveBool = (key: 'enablePoints' | 'showScore') => {
                if (previewRules[key] !== undefined) return previewRules[key];
                if (variantRules[key] !== undefined) return variantRules[key];
                return factoryRules[key] ?? false; 
            };

            // --- PHASE 3: MACROGAME ECONOMY OVERRIDE ---
            // The Macrogame is the ultimate authority. If the point system is ON at the macro level, 
            // it forces all microgames to participate and override their local point settings.
            const isMacroEconomyActive = macrogameToPreview?.config?.showPoints === true;

            const mergedRules = {
                ...factoryRules,
                ...variantRules,
                ...previewRules,
                enablePoints: isMacroEconomyActive ? true : resolveBool('enablePoints'),
                showScore: isMacroEconomyActive ? true : resolveBool('showScore'),
                scores: { 
                    ...eventDefaultScores,          
                    ...(factoryRules.scores || {}), 
                    ...(variantRules.scores || {}),  
                    ...(previewRules.scores || {}),
                    ...(flowItem.pointRules || {}) // Macrogame economy ultimate authority on point values
                },
                winCondition: { ...(factoryRules.winCondition || {}), ...(variantRules.winCondition || {}), ...(previewRules.winCondition || {}), ...(flowItem.winCondition || {}) },
                lossCondition: { ...(factoryRules.lossCondition || {}), ...(variantRules.lossCondition || {}), ...(previewRules.lossCondition || {}), ...(flowItem.lossCondition || {}) }
            };

            // 3. Resolve Mechanics (Fix for Tiny Player)
            const mergedMechanics = {
                ...(baseGame.mechanics || {}), // Base Defaults
                ...(customVariant?.mechanics || {}), // Custom Overrides
                ...(flowItem.mechanics || {}) // Preview Config Overrides
            };

            const gameName = customVariant ? customVariant.name : baseGame.name;
            
            const activePreGameConfig = flowItem.preGameConfig || macrogameToPreview.config.preGameConfig;
            const activeResultConfig = flowItem.resultConfig || macrogameToPreview.config.resultConfig;

            return { 
                ...baseGame, 
                ...flowItem, 
                name: gameName,
                customSkinData,
                rules: mergedRules, 
                mechanics: mergedMechanics,
                preGameConfig: activePreGameConfig,
                resultConfig: activeResultConfig,
                winCondition: flowItem.winCondition || variantRules.winCondition || factoryRules.winCondition || {},
                lossCondition: flowItem.lossCondition || variantRules.lossCondition || factoryRules.lossCondition || {}
            };
        }).filter(Boolean);

        const hydratedMacrogame = { ...macrogameToPreview, flow: flowWithDetails as any[] };

        // Preload Assets
        const gameIdsToPreload = flowWithDetails.map(g => g.id);
        const imageUrlsToPreload: string[] = [];
        if (hydratedMacrogame.introScreen.backgroundImageUrl) imageUrlsToPreload.push(hydratedMacrogame.introScreen.backgroundImageUrl);
        
        Promise.all([preloadMicrogames(gameIdsToPreload), preloadImages(imageUrlsToPreload)])
            .then(() => {
                setActiveMacrogame(hydratedMacrogame);
                setActiveSkin(foundSkin);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Preloading failed:", err);
                setIsLoading(false);
            });
            
    }, [previewConfig, macrogames, allMicrogames, customMicrogames]);

    const hasStarted = useRef(false);
    useEffect(() => {
        if (activeMacrogame && !isLoading && !hasStarted.current) {
            if (previewConfig?.isPreviewMode === 'single_game') {
                engine.setMode('simulation');
            }
            engine.start();
            hasStarted.current = true;
        }
    }, [activeMacrogame, isLoading, engine, previewConfig]);
    
    const handleRestart = useCallback(() => { 
        hasStarted.current = false; 
        engine.start(); 
        setHudState({ lives: null, maxLives: null, goalCurrent: null, goalTarget: null, timerProgress: 100 });
        setRunId(c => c + 1); 
    }, [engine]);

    // --- Handler for Game Updates ---
    const handleUpdateHUD = useCallback((payload: Partial<typeof hudState>) => {
        setHudState(prev => ({ ...prev, ...payload }));
    }, []);

    useLayoutEffect(() => {
        const calculateFontSize = () => {
            if (gameAreaRef.current) {
                // Base the font size on the container's width. 
                // The number 50 is a "magic number" that can be tweaked, but it's a good starting point.
                const newSize = gameAreaRef.current.clientWidth / 50;
                setGameAreaFontSize(newSize);
            }
        };

        // Calculate on initial render and on window resize
        calculateFontSize();
        window.addEventListener('resize', calculateFontSize);
        return () => window.removeEventListener('resize', calculateFontSize);
    }, [activeMacrogame]); // Rerun if the macrogame changes

    // --- CHECK: Should we show the Game View? ---
    const showGameView = ['game', 'result'].includes(engine.view) && !!engine.activeGameData;

    // --- DERIVE CONTENT SCALING ---
    const linkedScreen = allConversionScreens.find((s: ConversionScreen) => s.id === activeMacrogame?.conversionScreenId);
    // The Macrogame's global styling is the absolute source of truth for layout boundaries
    const contentWidth = activeMacrogame?.globalStyling?.width ?? 50;
    const contentHeight = activeMacrogame?.globalStyling?.height ?? 100;

    // --- PREPARE DATA (Unconditionally) ---
    // We must prepare these variables outside the 'if' block so useMemo can access them.
    const activeGameId = engine.activeGameData?.id;
    const ActiveMicrogame = activeGameId ? microgames[activeGameId] : null;
    
    // Extract data safely with fallbacks
    const skinConfig = (engine.activeGameData as any)?.customSkinData || {};
    const rules = (engine.activeGameData as any)?.rules || {};
    const mechanics = (engine.activeGameData as any)?.mechanics || {};
    
    const activePreGameConfig = (engine.activeGameData as any)?.preGameConfig || activeMacrogame?.config.preGameConfig;
    const activeResultConfig = (engine.activeGameData as any)?.resultConfig || activeMacrogame?.config.resultConfig;
    const isStandAloneResult = engine.view === 'result' && activeResultConfig?.format === 'stand_alone';
    
    // --- MEMOIZE GAME COMPONENT (Unconditionally) ---
    // This hook is now OUTSIDE the 'if' block to satisfy Rules of Hooks.
    const RenderedGame = React.useMemo(() => {
        // If we shouldn't show the game or don't have the component, return null.
        if (!showGameView || !ActiveMicrogame || !engine.activeGameData) return null;

        return (
            <ActiveMicrogame 
                key={runId} 
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
                isPlaying={engine.view === 'game' && !engine.isOverlayVisible}
            />
        );
    }, [
        showGameView, // Add dependency
        ActiveMicrogame, // Add dependency
        runId, 
        engine.activeGameData, // Dependency changed to full object
        skinConfig, 
        rules, 
        mechanics,
        engine.isOverlayVisible, 
        engine.onInteraction, 
        engine.onGameEnd, 
        engine.onReportEvent,
        handleUpdateHUD,
        engine.view
    ]);

    if (error) { return <div className="preview-error"><h2>Preview Error</h2><p>{error}</p></div>; }
    if (isLoading || !activeMacrogame || !activeSkin) { return <div className="preview-error"><h2>Loading Preview...</h2></div>; }

    const skinIdToUse = activeSkin.id === 'configurable-popup' ? 'configurable-popup-live' : activeSkin.id; // <-- USE THE LIVE SKIN HERE
    const SkinComponent = skinRegistry[skinIdToUse];
    if (!SkinComponent) { return <div className="preview-error"><h2>Error</h2><p>UI Skin "{activeSkin.name}" is not registered.</p></div>; }

    let content: React.ReactNode = null;  

    // --- RENDER CONTENT ---
    let microConfig = { showPoints: false, lifeIconType: 'heart' as any };
    let goalLabel: string | undefined;

    if (showGameView) {
        if (!ActiveMicrogame) {
             return <div className="preview-error"><h2>Error</h2><p>Microgame component not found for ID: {activeGameId}</p></div>;
        }

        const resultType = (engine.result as any)?.type || (engine.result?.win ? 'win' : 'loss');
        const winType = rules?.winCondition?.type;
        goalLabel = winType === 'quota' ? "Items Caught" : winType === 'score' ? "Points Earned" : undefined;

        microConfig = {
            showPoints: rules.enablePoints && rules.showScore,
            lifeIconType: (engine.activeGameData as any).hud?.lifeIcon || 'heart'
        };

        content = (
            <>
                {!isStandAloneResult && RenderedGame}

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
                            type={resultType as any}
                            score={engine.totalScore}
                            showScore={rules.enablePoints && rules.showScore}
                            onContinue={previewConfig?.isPreviewMode === 'single_game' ? handleRestart : engine.continueFlow}
                            onRetry={canRetry ? engine.retryCurrentMicrogame : undefined}
                            config={resultConfig}
                            macroConfig={activeMacrogame.config}
                            theme={activeMacrogame.globalStyling?.theme}
                            scoreLedger={engine.scoreLedger}
                            currentGameIndex={engine.currentFlowIndex}
                            isStandAlone={isStandAloneResult}
                            playScoreTallyAudio={engine.playScoreTallyAudio}
                        />
                    );
                })()}

                {/* --- Render Countdown if Result Screen is Disabled --- */}
                {/* Removed: Engine now handles immediate 0ms transition when screen is disabled */}
            </>
        );
    } else {
        // ... Standard Static Screens (Intro, Promo, End) ...
        const syncWidth = activeMacrogame.config.conversionScreenConfig?.syncWidth !== false;
        const finalConversionWidth = syncWidth ? contentWidth : (activeMacrogame.config.conversionScreenConfig?.customWidth ?? 100);

        const dataForStaticScreen = {
            macrogame: activeMacrogame,
            skin: activeSkin,
            isPreviewMode: previewConfig?.isPreviewMode,
            allConversionScreens: allConversionScreens,
            finalConversionWidth,
            contentHeight
        };
        // Rely on the engine spread (...engine) to natively pass advancePreGame and seamlessly transition the flow
        content = <StaticScreen {...engine} data={dataForStaticScreen} handleRestart={handleRestart} totalScore={engine.totalScore} pointCosts={activeMacrogame.pointCosts || {}} redeemPoints={engine.redeemPoints} playEventAudio={engine.playEventAudio} playClickAudio={engine.playClickAudio} playScreenTransitionAudio={engine.playScreenTransitionAudio} playTimerTickAudio={engine.playTimerTickAudio} playTimerGoAudio={engine.playTimerGoAudio} />;
    }

    // --- Conditionally build props for the skin component ---
    const skinProps: any = {
      isMuted: engine.isMuted,
      onClose: () => window.close(),
      onMute: engine.toggleMute,
    };

    if (activeSkin.id === 'configurable-popup') {
        skinProps.skinConfig = previewConfig?.container?.skinConfig || {};
    } else {
        skinProps.skin = activeSkin;
        skinProps.title = previewConfig?.container?.title;
        skinProps.subtitle = previewConfig?.container?.subtitle;
        skinProps.colorScheme = previewConfig?.container?.colorScheme;
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
            <SkinComponent {...skinProps}>
                {/* Layer 1: Bezel/Frame */}
                <div 
                    ref={gameAreaRef} 
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        fontSize: gameAreaFontSize,
                        backgroundColor: activeMacrogame.globalStyling?.theme === 'light' ? '#ffffff' : '#1a1a2e',
                        paddingTop: activeMacrogame.globalStyling?.paddingTop ?? 0,
                        paddingBottom: activeMacrogame.globalStyling?.paddingBottom ?? 0,
                        paddingLeft: activeMacrogame.globalStyling?.paddingLeft ?? 0,
                        paddingRight: activeMacrogame.globalStyling?.paddingRight ?? 0,
                        boxSizing: 'border-box',
                        borderRadius: activeMacrogame.globalStyling?.borderRadius ?? 0
                    }}
                >
                    {/* Layer 2: Inner boundary */}
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit' }}>
                        <UnifiedGameChrome
                            view={engine.view}
                            theme={activeMacrogame.globalStyling?.theme}
                            macroConfig={{
                                showPoints: activeMacrogame.config.showPoints ?? false,
                                showProgress: activeMacrogame.config.showProgress ?? false,
                                progressFormat: (activeMacrogame.config as any).progressFormat || 'visual',
                                progressShowLabels: (activeMacrogame.config as any).progressShowLabels ?? false,
                                hasIntro: activeMacrogame.introScreen?.enabled ?? false,
                                hasPromo: activeMacrogame.promoScreen?.enabled ?? false,
                                hudLayout: activeMacrogame.globalStyling?.hudLayout,
                                hudPaddingY: activeMacrogame.globalStyling?.hudPaddingY,
                                hudPaddingX: activeMacrogame.globalStyling?.hudPaddingX
                            }}
                            currentStep={engine.currentGameIndex}
                            totalSteps={activeMacrogame.flow.length}
                            totalScore={engine.totalScore}
                            progressText={engine.progressText}
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
                            showLayoutGuides={false}
                        >
                            {content}
                        </UnifiedGameChrome>
                    </div>
                </div>
            </SkinComponent>
        </div>
    );
};

export default PreviewHost;