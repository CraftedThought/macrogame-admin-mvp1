/* src/skins/ConfigurablePopupLive/index.tsx */

import React, { ReactNode } from 'react';
import styles from '../ConfigurablePopup/ConfigurablePopup.module.css';
import { SkinContentBlock, SkinConfig } from '../../types';
import 'react-quill-new/dist/quill.snow.css'; // Ensure styles are available for the rendered HTML

// --- ICONS (Copied from base) ---
const MUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";
const EXIT_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E";

const POPUP_WIDTH_MAP: { [key: string]: string } = {
    'small': '450px',
    'medium': '650px',
    'large': '800px',
};

interface ConfigurablePopupProps {
    children: ReactNode;
    isMuted: boolean;
    onClose: () => void;
    onMute: () => void;
    skinConfig: SkinConfig;
    title?: string;
    subtitle?: string;
    colorScheme?: string;
}

// We use 'ql-editor' class to inherit Quill's standard spacing/lists styles
const ContentBlock: React.FC<{ block: SkinContentBlock; style: React.CSSProperties }> = ({ block, style }) => (
    <div 
        className={`${styles.contentBlock} ql-editor`} 
        style={{ 
            ...style, 
            // padding: '0' REMOVED to fix conflict with paddingLeft/Right in 'style'
            overflow: 'hidden' 
        }} 
        // Render the HTML content safely
        dangerouslySetInnerHTML={{ __html: block.content }}
    />
);

const ConfigurablePopupLiveSkin: React.FC<ConfigurablePopupProps> = ({ 
    children, 
    isMuted, 
    onClose, 
    onMute,
    skinConfig
}) => {
    const { 
      header, 
      contentBlocks = [], 
      styling = {}, 
      showMuteButton = true, 
      showExitButton = true,
      muteButtonPosition = 'right',
      exitButtonPosition = 'right',
      buttonStyle = 'circle'
    } = skinConfig || {};
    
    const hasHeader = header?.title || showMuteButton || showExitButton;
    const blocksAbove = contentBlocks.filter(b => b.position === 'above');
    const blocksBelow = contentBlocks.filter(b => b.position === 'below');

    // 1. DEFINE GAME SECTION FIRST (Moved up to avoid ReferenceError)
    const gameSection = styling.gameSection || { 
        orientation: 'landscape', 
        alignment: 'center', 
        desktopHeightLimit: undefined,
        borderRadius: 4, 
        paddingTop: 0,
        paddingBottom: 0,
        paddingX: 0,
        leftContent: undefined,
        rightContent: undefined
    };

    // 2. Define Global Styling Helpers
    const globalPad = typeof styling.padding === 'number' ? styling.padding : 0;
    const radius = typeof styling.borderRadius === 'number' ? styling.borderRadius : 0;
    
    // 3. Calculate Smart Heights & Limits
    const rawPopupWidth = POPUP_WIDTH_MAP[styling.popupWidth || 'medium'];
    const popupWidthInt = parseInt(rawPopupWidth, 10);
    
    // Subtract Global Padding AND Game Section Side Padding for accurate width calc
    const gsPadX = (gameSection.paddingX || 0);
    const availableWidth = popupWidthInt - (globalPad * 2) - (gsPadX * 2);
    
    const halfWidth = availableWidth / 2;
    const smartPortraitHeight = Math.round(halfWidth * (16 / 9));

    // Resolve the "Maximum Popup Height" logic
    // If set by user, we apply it to the CONTAINER max-height.
    // If not set, we use the default CSS '85vh' (handled by class, so undefined here).
    const maxPopupHeight = gameSection.desktopHeightLimit 
        ? `${gameSection.desktopHeightLimit}px` 
        : undefined; 

    // 4. Resolve Game Radius Logic
    // Default to 4px. If explicitly set (including 0), use it. 
    // We treat an empty string (cleared input) as 0px.
    let gameRadius = 4;
    const rawRadius = gameSection.borderRadius;

    if (rawRadius !== undefined && rawRadius !== null) {
        if (rawRadius === '') {
             gameRadius = 0;
        } else {
             gameRadius = Number(rawRadius);
        }
    }

    const isPortrait = gameSection.orientation === 'portrait';
    const aspectRatio = isPortrait ? (9 / 16) : (16 / 9);
    
    // --- Responsive "Game Section" Layout (GRID) ---
    // We adjust the columns and placement based on alignment to ensure
    // flush edges (no gap) when aligned Left or Right.
    
    let gridColumns = '1fr auto 1fr'; // Default Center (3 Cols)
    let gameColPlacement = '2';       // Game in middle
    let leftSlotCol = '1';            // Left slot in 1
    let rightSlotCol = '3';           // Right slot in 3

    if (gameSection.alignment === 'left') {
        gridColumns = 'auto 1fr';     // 2 Cols: [Game] [RightContent]
        gameColPlacement = '1';       // Game Flush Left
        rightSlotCol = '2';           // Content takes rest
    } 
    else if (gameSection.alignment === 'right') {
        gridColumns = '1fr auto';     // 2 Cols: [LeftContent] [Game]
        gameColPlacement = '2';       // Game Flush Right
        leftSlotCol = '1';            // Content takes rest
    }

    const gameSectionStyle: React.CSSProperties = {
        width: '100%',
        display: isPortrait ? 'grid' : 'flex', // Grid for Pillarbox, Flex for Landscape
        gridTemplateColumns: isPortrait ? gridColumns : undefined, 
        
        // Flex fallback for Landscape (Center it)
        justifyContent: 'center', 
        alignItems: 'center', 
        
        // Gap removed to allow side slots to be flush with the game screen.
        // gap: '1rem', 
        position: 'relative',
        
        // Game Section Internal Padding (Applied to both Landscape and Portrait)
        paddingTop: `${gameSection.paddingTop || 0}px`,
        paddingBottom: `${gameSection.paddingBottom || 0}px`,
        paddingLeft: `${gameSection.paddingX || 0}px`,
        paddingRight: `${gameSection.paddingX || 0}px`,
        boxSizing: 'border-box', // Ensure padding doesn't break the layout width
    };

    const viewportStyle: React.CSSProperties = {
        position: 'relative',
        borderRadius: `${gameRadius}px`,
        overflow: 'hidden',
        aspectRatio: `${aspectRatio}`,
        
        // Dynamic Grid placement
        gridColumn: isPortrait ? gameColPlacement : undefined,
        
        // Flex behavior for Landscape
        flex: isPortrait ? '0 0 auto' : '0 0 auto',
        
        // CONDITIONAL SIZING
        width: isPortrait ? 'auto' : '100%',
        // Always use Smart Height for Portrait. The user's limit is now on the CONTAINER.
        height: isPortrait ? `${smartPortraitHeight}px` : 'auto',
        maxWidth: '100%',
    };

    // Side Slot Styles
    const slotPadTop = typeof gameSection.slotPaddingTop === 'number' ? `${gameSection.slotPaddingTop}px` : '0px';
    const slotPadBottom = typeof gameSection.slotPaddingBottom === 'number' ? `${gameSection.slotPaddingBottom}px` : '0px';
    const slotPadX = typeof gameSection.slotPaddingX === 'number' ? `${gameSection.slotPaddingX}px` : '0px';
    
    const slotAlignMap: Record<string, string> = {
        'top': 'start',
        'center': 'center',
        'bottom': 'end'
    };
    const alignSelf = slotAlignMap[gameSection.slotVerticalAlign || 'center'];

    const sideSlotStyle: React.CSSProperties = {
        minWidth: '0',   // Prevent grid overflow
        wordWrap: 'break-word',
        alignSelf: alignSelf, // Controlled Vertical Alignment
        
        // Default to white text so it's visible, but allow Editor to override
        color: '#ffffff',

        // Explicit padding overrides the 'ql-editor' default padding
        paddingTop: slotPadTop,
        paddingBottom: slotPadBottom,
        paddingLeft: slotPadX,
        paddingRight: slotPadX,
    };
    // --- Container Style ---
    const containerStyle: React.CSSProperties = {
        fontFamily: styling.fontFamily || "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
        backgroundColor: styling.backgroundColor || '#292929',
        // FIX: Remove padding from scroll container so Sticky Header works correctly (covers the top gap)
        padding: 0,
        // NEW: Allow manual override of the 85vh max-height safety net
        maxHeight: maxPopupHeight,
        // @ts-ignore
        '--popup-max-width': POPUP_WIDTH_MAP[styling.popupWidth || 'medium'],
        // @ts-ignore
        '--popup-border-radius': `${radius}px`,
        // @ts-ignore
        '--popup-shadow-opacity': ((styling.boxShadowStrength || 0) / 100).toFixed(2),
    };
    
    // --- 1. Header Styles (Adapted for 0-padding Container) ---
    const headerPadTop = typeof header?.paddingTop === 'number' ? `${header.paddingTop}px` : '0px';
    const headerPadBottom = typeof header?.paddingBottom === 'number' ? `${header.paddingBottom}px` : '0px';
    const headerPadX = typeof header?.paddingX === 'number' ? `${header.paddingX}px` : '0px';
    const headerSpan = styling.headerBgSpanEdges;

    // Logic: If Span is FALSE, we must add the Global Pad to the header's padding so it looks indented.
    // If Span is TRUE, the header touches the edges, so we only use the header's own padding.
    const finalHeaderPadLeft = headerSpan ? headerPadX : `calc(${headerPadX} + ${globalPad}px)`;
    const finalHeaderPadRight = headerSpan ? headerPadX : `calc(${headerPadX} + ${globalPad}px)`;
    const finalHeaderPadTop = headerSpan ? headerPadTop : `calc(${headerPadTop} + ${globalPad}px)`;

    const headerStyle: React.CSSProperties = {
      // Default to global background so sticky header obscures scrolling content
      backgroundColor: styling.headerBackground || styling.backgroundColor || '#292929',
      color: header?.textColor || '#ffffff',
      
      marginTop: 0, // No negative margin needed
      paddingTop: finalHeaderPadTop,
      paddingBottom: headerPadBottom,
      paddingLeft: finalHeaderPadLeft,
      paddingRight: finalHeaderPadRight,
      
      borderTopLeftRadius: headerSpan ? `${radius}px` : 0,
      borderTopRightRadius: headerSpan ? `${radius}px` : 0,
      minHeight: 'auto', 
    };
    
    // --- 2. Body Wrapper Style (Provides the Global Padding for non-header content) ---
    const bodyStyle: React.CSSProperties = {
        paddingLeft: `${globalPad}px`,
        paddingRight: `${globalPad}px`,
        paddingBottom: `${globalPad}px`,
        // If NO header, we need top padding here. If Header exists, it handles the top space.
        paddingTop: hasHeader ? 0 : `${globalPad}px`,
    };

    // --- 3. Content Styles ---
    const contentPadTop = typeof styling.contentPaddingTop === 'number' ? `${styling.contentPaddingTop}px` : '0px';
    const contentPadBottom = typeof styling.contentPaddingBottom === 'number' ? `${styling.contentPaddingBottom}px` : '0px';
    const contentPadX = typeof styling.contentPaddingX === 'number' ? `${styling.contentPaddingX}px` : '0px';
    const contentSpan = styling.contentBgSpanEdges;
    
    // Logic: Since Body Wrapper adds Global Pad, "Span Edges" now means Negative Margin to pull it back out.
    const contentMarginX = contentSpan ? `-${globalPad}px` : 0;
    // Padding X: If spanning, we need to add Global Pad back to the text so it's readable? 
    // Usually, "Span Edges" implies the background touches edges, but text aligns with other content.
    // However, to keep it simple and flexible: Spanning pulls the box out. Padding inside controls text.
    // We add GlobalPad to the padding if spanning, so text doesn't hit the edge? 
    // Let's stick to the previous logic: If Spanned, add GlobalPad to padding so text is aligned with non-spanned content.
    const finalContentPadX = contentSpan ? `calc(${contentPadX} + ${globalPad}px)` : contentPadX;

    const contentStyleBase: React.CSSProperties = {
        backgroundColor: styling.contentBackground || 'transparent',
        // Decouple from header color.
        color: '#ffffff', 
        marginLeft: contentMarginX,
        marginRight: contentMarginX,
        paddingLeft: finalContentPadX,
        paddingRight: finalContentPadX,
        paddingTop: contentPadTop,
    };

    const contentStyleAbove: React.CSSProperties = {
        ...contentStyleBase,
        paddingBottom: contentPadBottom,
        marginBottom: 0,
    };

    const contentStyleBelow: React.CSSProperties = {
        ...contentStyleBase,
        paddingBottom: contentPadBottom, // We don't need calc here because Body Wrapper handles bottom global pad
        marginBottom: contentSpan ? `-${globalPad}px` : 0, // Pull bottom flush if spanning
        borderBottomLeftRadius: contentSpan ? `${radius}px` : 0,
        borderBottomRightRadius: contentSpan ? `${radius}px` : 0,
    };

    const renderButton = (type: 'mute' | 'exit', pos: 'left' | 'right') => {
        const isMinimal = buttonStyle === 'minimal';
        const marginFix = isMinimal ? (pos === 'left' ? { marginLeft: '-6px' } : { marginRight: '-6px' }) : {};
        const buttonBaseStyle: React.CSSProperties = {
            // Pass undefined for default so CSS class (and hover) can take effect
            backgroundColor: isMinimal ? 'transparent' : undefined,
            ...marginFix
        };

        if (type === 'mute') {
             return (
                <button key="mute" type="button" className={styles.controlButton} onClick={onMute} aria-label={isMuted ? "Unmute" : "Mute"} style={buttonBaseStyle}>
                    <img src={isMuted ? MUTE_ICON : UNMUTE_ICON} alt="Mute/Unmute" />
                </button>
             );
        } else {
             return (
                <button key="exit" type="button" className={styles.controlButton} onClick={onClose} aria-label="Close" style={buttonBaseStyle}>
                    <img src={EXIT_ICON} alt="Close" />
                </button>
             );
        }
    };

    const leftButtons = [];
    if (showMuteButton && muteButtonPosition === 'left') leftButtons.push(renderButton('mute', 'left'));
    if (showExitButton && exitButtonPosition === 'left') leftButtons.push(renderButton('exit', 'left'));

    const rightButtons = [];
    if (showMuteButton && muteButtonPosition !== 'left') rightButtons.push(renderButton('mute', 'right'));
    if (showExitButton && exitButtonPosition !== 'left') rightButtons.push(renderButton('exit', 'right'));

    const containerClasses = `${styles.container} ${hasHeader || blocksAbove.length > 0 ? styles.containerWithHeader : ''}`;

    return (
        <div className={containerClasses} style={containerStyle}>
            {/* CSS for Quill & Responsive Game Section */}
            <style>{`
                /* Standard Paragraph Spacing */
                .ql-editor p { 
                    margin-bottom: 0.5em !important; 
                    margin-top: 0 !important; 
                }
                
                /* FIX: Remove bottom margin from the LAST paragraph to kill "ghost padding" */
                .ql-editor p:last-child {
                    margin-bottom: 0 !important;
                }

                /* Editor Container Resets */
                .ql-editor { 
                    height: auto !important; 
                    min-height: 0 !important; 
                    padding: 0; /* Reset library default to 0 so inline styles have full control */
                }

                /* --- FIX LIST OFFSETS: Hybrid Approach --- */
                
                /* 1. Base State (Left Align): Use Outside positioning for clean Hanging Indents */
                .ql-editor ul,
                .ql-editor ol {
                    padding-left: 1.2em !important; /* Create gutter for bullets */
                    margin-left: 0 !important;
                    list-style-position: outside !important; /* Bullet sits in gutter */
                }
                
                /* 2. List Items: Reset internal spacing */
                .ql-editor li {
                    padding: 0 !important;
                    margin: 0 !important;
                }

                /* 3. Centered Items Override: Fix the "Right Shift" issue */
                /* When centered, we want the bullet to hug the text (inside) 
                   and we need to cancel the parent's 1.5em padding so it's truly centered. */
                .ql-editor li.ql-align-center {
                    list-style-position: inside !important;
                    margin-left: -1.5em !important; /* Pull back to true center */
                }

                /* 4. Right Aligned Items Override */
                .ql-editor li.ql-align-right {
                    list-style-position: inside !important;
                    margin-left: -1.5em !important; /* Pull back to align correctly */
                }
                
                /* Responsive Logic for Game Section */
                @media (max-width: 600px) {
                    .game-section {
                        display: flex !important;
                        flex-direction: column !important; /* Mobile Stack */
                    }
                    /* On mobile, game fills width */
                    .game-viewport {
                        width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        aspect-ratio: ${aspectRatio} !important;
                    }
                }
            `}</style>
            
            {hasHeader && (
                <div className={styles.header} style={headerStyle}>
                    <div style={{ gridColumn: '1 / 2', display: 'flex', gap: '10px', justifyContent: 'flex-start', alignItems: 'center' }}>{leftButtons}</div>
                    <div className={styles.headerText}>
                        {header?.title && <h2 className={styles.title} style={{ fontWeight: header.fontWeight || 'bold' }}>{header.title}</h2>}
                    </div>
                    <div className={styles.controls} style={{ gridColumn: '3 / 4' }}>{rightButtons}</div>
                </div>
            )}

            {/* --- WRAPPER FOR SCROLLING CONTENT --- */}
            <div style={bodyStyle}>
                {blocksAbove.map(block => (
                  <ContentBlock key={block.id} block={block} style={contentStyleAbove} />
                ))}

                {/* --- THE GAME SECTION --- */}
                <div className="game-section" style={gameSectionStyle}>
                    {/* LEFT SLOT */}
                    {isPortrait && gameSection.leftContent && (
                        <div 
                            style={{ ...sideSlotStyle, gridColumn: leftSlotCol }} 
                            className="ql-editor" 
                            dangerouslySetInnerHTML={{ __html: gameSection.leftContent }} 
                        />
                    )}

                    {/* THE GAME VIEWPORT */}
                    <div className="game-viewport" style={viewportStyle}>
                        {children}
                    </div>

                    {/* RIGHT SLOT */}
                    {isPortrait && gameSection.rightContent && (
                        <div 
                            style={{ ...sideSlotStyle, gridColumn: rightSlotCol }} 
                            className="ql-editor" 
                            dangerouslySetInnerHTML={{ __html: gameSection.rightContent }} 
                        />
                    )}
                </div>
                
                {!hasHeader && blocksAbove.length === 0 && (
                  <>
                    {showExitButton && <button type="button" className={styles.exitButton} onClick={onClose} aria-label="Close"><img src={EXIT_ICON} alt="Close" /></button>}
                    {showMuteButton && <button type="button" className={styles.muteButton} onClick={onMute} aria-label={isMuted ? "Unmute" : "Mute"}><img src={isMuted ? MUTE_ICON : UNMUTE_ICON} alt="Mute/Unmute" /></button>}
                  </>
                )}
                
                {blocksBelow.map(block => (
                  <ContentBlock key={block.id} block={block} style={contentStyleBelow} />
                ))}
            </div>
        </div>
    );
};

export default ConfigurablePopupLiveSkin;