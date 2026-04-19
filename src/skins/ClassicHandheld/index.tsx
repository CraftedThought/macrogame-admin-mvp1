// src/skins/ClassicHandheld/index.tsx

import React, { ReactNode } from 'react';
import defaultStyles from './ClassicHandheld.module.css';
import purpleStyles from './ClassicHandheld-purple.module.css';
import exitButtonSvg from '/assets/svgs/handheld-classic-exit-button.svg';
import accentsSvg from '/assets/svgs/handheld-classic-accents.svg';
import dpadSvg from '/assets/svgs/handheld-classic-dpad.svg';
import baButtonsSvg from '/assets/svgs/handheld-classic-ba-buttons.svg';
import selectStartSvg from '/assets/svgs/handheld-classic-select-start.svg';
import purpleAccentsSvg from '/assets/svgs/handheld-classic-accents-purple.svg';
import purpleDpadSvg from '/assets/svgs/handheld-classic-dpad-purple.svg';
import purpleBaButtonsSvg from '/assets/svgs/handheld-classic-ba-buttons-purple.svg';
import purpleSelectStartSvg from '/assets/svgs/handheld-classic-select-start-purple.svg';

const MUTE_ICON_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23333'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23333'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";
const MUTE_ICON_LIGHT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON_LIGHT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EEE'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";

const getSkinStyles = (colorScheme?: string) => {
    return colorScheme === 'purple' ? purpleStyles : defaultStyles;
};

interface ClassicHandheldProps {
    children: ReactNode;
    isMuted: boolean;
    onClose: () => void;
    onMute: () => void;
    title?: string;
    subtitle?: string;
    colorScheme?: string;
}

const ClassicHandheldSkin: React.FC<ClassicHandheldProps> = ({ children, isMuted, onClose, onMute, title, subtitle, colorScheme }) => {
    const styles = getSkinStyles(colorScheme);
    const isPurple = colorScheme === 'purple';
    const muteIcon = isPurple ? MUTE_ICON_LIGHT : MUTE_ICON_DARK;
    const unmuteIcon = isPurple ? UNMUTE_ICON_LIGHT : UNMUTE_ICON_DARK;

    return (
        <div className={styles.container}>
            {/* CORRECTED STRUCTURE: screenTrimFrame and gameArea are siblings */}
            <div className={styles.screenTrimFrame} />
            <div className={styles.gameArea}>
                {children}
            </div>

            <h1 className={styles.title}>{title}</h1>
            <h2 className={styles.subtitle}>{subtitle}</h2>
            <img src={isPurple ? purpleAccentsSvg : accentsSvg} className={styles.accents} alt="" />
            <img src={isPurple ? purpleDpadSvg : dpadSvg} className={styles.dpad} alt="" />
            <img src={isPurple ? purpleSelectStartSvg : selectStartSvg} className={styles.selectStart} alt="" />
            <img src={isPurple ? purpleBaButtonsSvg : baButtonsSvg} className={styles.baButtons} alt="" />
            <button onClick={onClose} className={styles.exitButton} aria-label="Close"><img src={exitButtonSvg} alt="Exit" /></button>
            <button onClick={onMute} className={styles.muteButton} aria-label="Mute"><img src={isMuted ? muteIcon : unmuteIcon} alt="Mute/Unmute" /></button>
        </div>
    );
};

export default ClassicHandheldSkin;