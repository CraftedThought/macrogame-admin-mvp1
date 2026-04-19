/* src/components/ui/inputs/SmartNumberInput.tsx */

import React, { useState, useEffect, FocusEvent, ChangeEvent } from 'react';

interface SmartNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number;
    onChange: (newValue: number) => void;
    allowNegative?: boolean;
    fallbackValue?: number;
}

export const SmartNumberInput: React.FC<SmartNumberInputProps> = ({ 
    value, 
    onChange, 
    allowNegative = false, 
    fallbackValue = 0, // Defaults to 0 to preserve standard behavior
    ...props 
}) => {
    // We keep a local string state to allow for "", "-", "0." etc.
    const [inputValue, setInputValue] = useState<string>(String(value));

    // Sync with external prop changes
    // We only update if the prop value is mathematically different from our current input
    // This prevents the cursor from jumping if the user types "1.0" and the prop is 1
    useEffect(() => {
        const currentParsed = inputValue === '' || inputValue === '-' ? 0 : Number(inputValue);
        if (currentParsed !== value) {
            setInputValue(String(value));
        }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        // 1. Handle Empty State
        if (raw === '') {
            setInputValue('');
            onChange(fallbackValue); 
            return;
        }

        // 2. Handle Minus Sign (Intermediate state)
        if (allowNegative && raw === '-') {
            setInputValue('-');
            return; 
        }

        // 3. Handle Valid Numbers
        const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
        if (regex.test(raw)) {
            setInputValue(raw);
            const parsed = Number(raw);
            if (!isNaN(parsed)) {
                onChange(parsed);
            }
        }
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        // On blur, if it's incomplete, force it to the fallback
        if (inputValue === '' || inputValue === '-') {
            setInputValue(String(fallbackValue));
            onChange(fallbackValue);
        }
        if (props.onBlur) props.onBlur(e);
    };

    return (
        <input
            type="number" // <--- This enables the native browser arrows/spinners
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            // --- NEW: Prevent scroll from changing value ---
            onWheel={(e) => e.currentTarget.blur()}
            {...props}
        />
    );
};