// src/skins/Tablet/index.tsx

import React, { ReactNode } from 'react';
import defaultStyles from './Tablet.module.css';
import blackStyles from './Tablet-black.module.css';
import whiteCameraLens from '/assets/svgs/tablet-white-camera-lens.svg';
import blackCameraLens from '/assets/svgs/tablet-black-camera-lens.svg';

// --- DATA URI ICONS RESTORED ---
const MUTE_ICON_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";
const EXIT_ICON_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E";

const MUTE_ICON_LIGHT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON_LIGHT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";
const EXIT_ICON_LIGHT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E";

const getSkinStyles = (colorScheme?: string) => {
    return colorScheme === 'black' ? blackStyles : defaultStyles;
};

interface TabletProps {
    children: ReactNode;
    isMuted: boolean;
    onClose: () => void;
    onMute: () => void;
    title?: string;
    subtitle?: string;
    colorScheme?: string;
}

const TabletSkin: React.FC<TabletProps> = ({ children, isMuted, onClose, onMute, title, subtitle, colorScheme }) => {
    const styles = getSkinStyles(colorScheme);
    const isBlack = colorScheme === 'black';

    const muteIcon = isBlack ? MUTE_ICON_LIGHT : MUTE_ICON_DARK;
    const unmuteIcon = isBlack ? UNMUTE_ICON_LIGHT : UNMUTE_ICON_DARK;
    const exitIcon = isBlack ? EXIT_ICON_LIGHT : EXIT_ICON_DARK;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{title}</h1>
            <img src={isBlack ? blackCameraLens : whiteCameraLens} className={styles.cameraLens} alt="" />
            <div className={styles.homeButton} />
            <div className={styles.gameArea}>
                {children}
            </div>
            <h2 className={styles.subtitle}>{subtitle}</h2>

            {/* --- BUTTONS RESTORED --- */}
            <button onClick={onMute} className={styles.muteButton} aria-label="Mute"><img src={isMuted ? muteIcon : unmuteIcon} alt="Mute/Unmute" /></button>
            <button onClick={onClose} className={styles.exitButton} aria-label="Close"><img src={exitIcon} alt="Exit" /></button>
        </div>
    );
};

export default TabletSkin;