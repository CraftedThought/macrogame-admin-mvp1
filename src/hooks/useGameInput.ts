/* src/hooks/useGameInput.ts */

import { useRef, useEffect } from 'react';

interface GameInputState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    action: boolean; // Spacebar or Click
}

export const useGameInput = (isActive: boolean, onInput?: () => void) => {
    // We use a Ref for inputs to prevent re-renders on every keypress.
    const keysPressed = useRef<GameInputState>({
        up: false,
        down: false,
        left: false,
        right: false,
        action: false
    });

    // Keep refs fresh for the event listeners without re-binding them
    const onInputRef = useRef(onInput);
    const isActiveRef = useRef(isActive);

    useEffect(() => {
        onInputRef.current = onInput;
        isActiveRef.current = isActive;
    }, [onInput, isActive]);

    useEffect(() => {
        // We ALWAYS listen to keys to ensure state doesn't get "stuck" or "missed"
        // during transitions (e.g. Overlay -> Game). 
        // We only trigger the *callback* if active.

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Prevent inputs if user is typing in a form field or rich text editor
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

            const key = e.key.toLowerCase();
            const validKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'enter'];

            if (validKeys.includes(key)) {
                // Prevent scrolling for navigation keys
                if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
                    e.preventDefault();
                }

                // Map Keys to Abstract Actions (Always update state)
                if (key === 'w' || key === 'arrowup') keysPressed.current.up = true;
                if (key === 's' || key === 'arrowdown') keysPressed.current.down = true;
                if (key === 'a' || key === 'arrowleft') keysPressed.current.left = true;
                if (key === 'd' || key === 'arrowright') keysPressed.current.right = true;
                if (key === ' ' || key === 'enter') keysPressed.current.action = true;
                
                // Only trigger the "Any Key" callback if explicitly active
                if (isActiveRef.current && onInputRef.current) {
                    onInputRef.current();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // FIX: Add optional chaining (?.) to prevent crash on autocomplete events where key might be undefined
            const key = e.key?.toLowerCase();
            if (!key) return; 

            // Always clear state on keyup to prevent stuck keys
            if (key === 'w' || key === 'arrowup') keysPressed.current.up = false;
            if (key === 's' || key === 'arrowdown') keysPressed.current.down = false;
            if (key === 'a' || key === 'arrowleft') keysPressed.current.left = false;
            if (key === 'd' || key === 'arrowright') keysPressed.current.right = false;
            if (key === ' ' || key === 'enter') keysPressed.current.action = false;
        };

        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            // We do NOT reset keysPressed here anymore, 
            // so state persists across re-renders/toggles.
        };
    }, []); // Empty dependency array = Listeners persist for component lifecycle

    return keysPressed;
};