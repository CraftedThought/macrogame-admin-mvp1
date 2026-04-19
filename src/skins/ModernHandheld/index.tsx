// src/skins/ModernHandheld/index.tsx

import React, { ReactNode } from 'react';
import defaultStyles from './ModernHandheld.module.css';
import redStyles from './ModernHandheld-red.module.css';
import dpadSvg from '/assets/svgs/handheld-modern-dpad.svg';
import buttonsSvg from '/assets/svgs/handheld-modern-buttons.svg';
import selectStartSvg from '/assets/svgs/handheld-modern-select-start.svg';
import redDpadSvg from '/assets/svgs/handheld-modern-dpad-red.svg';
import redButtonsSvg from '/assets/svgs/handheld-modern-buttons-red.svg';
import redSelectStartSvg from '/assets/svgs/handheld-modern-select-start-red.svg';
import exitButtonSvg from '/assets/svgs/handheld-classic-exit-button.svg';

const MUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";

const getSkinStyles = (colorScheme?: string) => {
    return colorScheme === 'red' ? redStyles : defaultStyles;
};

interface ModernHandheldProps {
    children: ReactNode;
    isMuted: boolean;
    onClose: () => void;
    onMute: () => void;
    title?: string;
    subtitle?: string;
    colorScheme?: string;
}

const ModernHandheldSkin: React.FC<ModernHandheldProps> = ({ children, isMuted, onClose, onMute, title, subtitle, colorScheme }) => {
    const styles = getSkinStyles(colorScheme);
    const isRed = colorScheme === 'red';

    return (
        <div className={styles.container}>
            {/* CORRECTED STRUCTURE: screenTrimFrame and gameArea are siblings */}
            <div className={styles.screenTrimFrame} />
            <div className={styles.gameArea}>
                {children}
            </div>

            <h1 className={styles.title}>{title}</h1>
            <h2 className={styles.subtitle}>{subtitle}</h2>
            <img src={isRed ? redDpadSvg : dpadSvg} className={styles.dpad} alt="" />
            <img src={isRed ? redButtonsSvg : buttonsSvg} className={styles.buttons} alt="" />
            <img src={isRed ? redSelectStartSvg : selectStartSvg} className={styles.selectStart} alt="" />
            <button onClick={onClose} className={styles.exitButton} aria-label="Close">
                <img src={exitButtonSvg} alt="Exit" />
            </button>
            <button className={styles.muteButton} onClick={onMute}><img src={isMuted ? MUTE_ICON : UNMUTE_ICON} alt="Mute/Unmute" /></button>
        </div>
    );
};

export default ModernHandheldSkin;