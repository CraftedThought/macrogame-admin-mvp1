/* src/skins/ConfigurablePopup/index.tsx */

import React, { ReactNode } from 'react';
import styles from './ConfigurablePopup.module.css';
import { SkinConfig, SkinContentBlock } from '../../types';

// --- ICONS (Copied from Barebones) ---
const MUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";
const EXIT_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E";

interface ConfigurablePopupProps {
    children: ReactNode;
    isMuted: boolean;
    onClose: () => void;
    onMute: () => void;
    // This prop will come from the DeliveryContainer
    skinConfig: SkinConfig;
    
    // Unused by this skin, but passed for consistency
    title?: string;
    subtitle?: string;
    colorScheme?: string;
}

// --- Helper Component for Content Blocks ---
const ContentBlock: React.FC<{ block: SkinContentBlock; style: React.CSSProperties }> = ({ block, style }) => (
  <div className={styles.contentBlock} style={{ ...style, textAlign: block.alignment }}>
    {block.header && <h3 className={styles.contentHeader}>{block.header}</h3>}
    {block.subheader && <h4 className={styles.contentSubheader}>{block.subheader}</h4>}
    {block.body && <p className={styles.contentBody}>{block.body}</p>}
  </div>
);

// --- Main Skin Component ---
const ConfigurablePopupSkin: React.FC<ConfigurablePopupProps> = ({ 
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
      showExitButton = true 
    } = skinConfig || {};
    
    const hasHeader = header?.title || header?.subtitle;

    const blocksAbove = contentBlocks.filter(b => b.position === 'above');
    const blocksBelow = contentBlocks.filter(b => b.position === 'below');

    // --- Dynamic Styling ---
    const containerStyle: React.CSSProperties = {
      backgroundColor: styling.backgroundColor || '#1c1e21',
    };
    
    const headerStyle: React.CSSProperties = {
      backgroundColor: styling.headerBackground || '#2a2d30',
      color: header?.textColor || '#ffffff',
    };
    
    const contentStyle: React.CSSProperties = {
      backgroundColor: styling.contentBackground || '#2a2d30',
      color: header?.textColor || '#ffffff', // Use header text color for now
    };

    // --- LOGIC FIX: Determine container class ---
    const containerClasses = `${styles.container} ${hasHeader || blocksAbove.length > 0 ? styles.containerWithHeader : ''}`;

    return (
        <div className={containerClasses} style={containerStyle}>
            
            {/* --- 1. Header --- */}
            {hasHeader && (
                <div className={styles.header} style={headerStyle}>
                    <div className={styles.headerText}>
                        {header?.title && <h2 className={styles.title}>{header.title}</h2>}
                    </div>
                    <div className={styles.controls}>
                        {showMuteButton && (
                            <button className={styles.controlButton} onClick={onMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                                <img src={isMuted ? MUTE_ICON : UNMUTE_ICON} alt="Mute/Unmute" />
                            </button>
                        )}
                        {showExitButton && (
                            <button className={styles.controlButton} onClick={onClose} aria-label="Close">
                                <img src={EXIT_ICON} alt="Close" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- 2. Content Blocks (Above) --- */}
            {blocksAbove.map(block => (
              <ContentBlock key={block.id} block={block} style={contentStyle} />
            ))}

            {/* --- 3. Game Area (The 16:9 Stage) --- */}
            <div className={styles.gameArea}>
                {children}
            </div>
            
            {/* --- 4. "Minimal State" Buttons --- */}
            {/* These are rendered *only if* there is no header AND no content blocks above */
             /* This logic is now correct and matches Barebones */
            }
            {!hasHeader && blocksAbove.length === 0 && (
              <>
                {showExitButton && (
                  <button className={styles.exitButton} onClick={onClose} aria-label="Close">
                      <img src={EXIT_ICON} alt="Close" />
                  </button>
                )}
                {showMuteButton && (
                  <button className={styles.muteButton} onClick={onMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                      <img src={isMuted ? MUTE_ICON : UNMUTE_ICON} alt="Mute/Unmute" />
                  </button>
                )}
              </>
            )}
            
            {/* --- 5. Content Blocks (Below) --- */}
            {blocksBelow.map(block => (
              <ContentBlock key={block.id} block={block} style={contentStyle} />
            ))}

        </div>
    );
};

export default ConfigurablePopupSkin;