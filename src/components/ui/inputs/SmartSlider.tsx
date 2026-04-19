/* src/components/ui/inputs/SmartSlider.tsx */

import React from 'react';
import { SmartNumberInput } from './SmartNumberInput'; // Reusing your new component!

interface SmartSliderProps {
    // Core Data
    value: number;
    onChange: (newValue: number) => void;
    min: number;
    max: number;
    step?: number;

    // Display
    label?: string;       // e.g. "Player Speed"
    suffix?: string;      // e.g. "%", "px", "ms"
    description?: string; // Optional helper text below

    // Interaction (For Live Preview)
    onPointerDown?: () => void;
    onPointerUp?: () => void;

    // Layout
    showInput?: boolean; // If true, shows a typeable box next to slider
    disabled?: boolean;
}

export const SmartSlider: React.FC<SmartSliderProps> = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    label,
    suffix = '',
    description,
    onPointerDown,
    onPointerUp,
    showInput = true, // Default to true for better UX
    disabled = false
}) => {
    return (
        <div style={{ marginBottom: '1rem', opacity: disabled ? 0.6 : 1 }}>
            {/* 1. Header: Label and Value Display */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                {label && (
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#333' }}>
                        {label}
                    </label>
                )}
                
                {/* If input is hidden, show static text. If shown, the input below handles visuals. */}
                {!showInput && (
                    <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>
                        {Math.round(value * 100) / 100}{suffix}
                    </span>
                )}
            </div>

            {/* 2. Controls: Slider + Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(Number(e.target.value))}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    style={{ flex: 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                />

                {showInput && (
                    <div style={{ width: '90px', flexShrink: 0, position: 'relative' }}>
                        <SmartNumberInput
                            value={value}
                            // Pass min/max to input so arrows stop correctly
                            min={min}
                            max={max}
                            onChange={(val) => {
                                const clamped = Math.min(Math.max(val, min), max);
                                onChange(clamped);
                            }}
                            allowNegative={min < 0}
                            style={{
                                width: '100%',
                                padding: '4px 8px',
                                // --- FIX: Add paddingRight to prevent text hitting the suffix ---
                                paddingRight: suffix ? '32px' : '8px', 
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textAlign: 'right'
                            }}
                        />
                        {suffix && (
                            <span style={{ 
                                position: 'absolute', 
                                // --- FIX: Position it safely to the left of the browser spinners ---
                                right: '20px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                fontSize: '0.7rem', 
                                color: '#999',
                                pointerEvents: 'none',
                                userSelect: 'none',
                                backgroundColor: 'transparent' // Ensure no background obscures it
                            }}>
                                {suffix}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Description (Optional) */}
            {description && (
                <p style={{ fontSize: '0.7rem', color: '#999', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                    {description}
                </p>
            )}
        </div>
    );
};