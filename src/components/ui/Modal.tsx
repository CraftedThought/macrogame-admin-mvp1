/* src/components/ui/Modal.tsx */

import React, { ReactNode, useEffect, useRef } from 'react';
import { styles } from '../../App.styles';

// Module-level variables to track open modals and original body style.
let openModalCount = 0;
let originalBodyOverflow: string | null = null;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'small' | 'medium' | 'large';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'small' }) => {
    // --- NEW: Track where the mouse down event happened ---
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (openModalCount === 0) {
                originalBodyOverflow = window.getComputedStyle(document.body).overflow;
                document.body.style.overflow = 'hidden';
            }
            openModalCount++;
        }

        return () => {
            if (isOpen) {
                openModalCount--;
                if (openModalCount === 0) {
                    document.body.style.overflow = originalBodyOverflow || '';
                    originalBodyOverflow = null;
                }
            }
        };
    }, [isOpen]);
    
    if (!isOpen) {
        return null;
    }

    const getSizeStyle = () => {
        switch (size) {
            case 'large':
                return styles.modalContentLarge;
            case 'medium':
                return styles.modalContentMedium;
            case 'small':
            default:
                return styles.modalContent;
        }
    };

    // --- NEW: Handler for mouse down on the overlay ---
    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        mouseDownTarget.current = e.target;
    };

    // --- NEW: Handler for mouse up (click) on the overlay ---
    const handleOverlayClick = (e: React.MouseEvent) => {
        // Only close if the mouse started AND ended on the overlay (e.currentTarget)
        if (mouseDownTarget.current === e.currentTarget && e.target === e.currentTarget) {
            onClose();
        }
        // Reset target
        mouseDownTarget.current = null;
    };

    return (
        <div 
            style={styles.modalOverlay} 
            onMouseDown={handleOverlayMouseDown} // Track mouse down
            onClick={handleOverlayClick}         // Track mouse up/click
        >
            <div style={getSizeStyle()} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={{...styles.h2, margin: 0, fontSize: '1.5rem'}}>{title}</h2>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                    {children}
                </div>
                {footer && (
                    <div style={styles.modalFooter}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};