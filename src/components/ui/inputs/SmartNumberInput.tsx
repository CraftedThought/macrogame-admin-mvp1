import React, { useState, useEffect, FocusEvent, ChangeEvent } from 'react';

interface SmartNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'max' | 'min'> {
    value: number;
    onChange: (newValue: number) => void;
    allowNegative?: boolean;
    fallbackValue?: number;
    max?: number;
    min?: number;
}

export const SmartNumberInput: React.FC<SmartNumberInputProps> = ({ 
    value, 
    onChange, 
    allowNegative = false, 
    fallbackValue = 0, 
    max,
    min,
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
    }, [value, inputValue]);

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
            let parsed = Number(raw);
            if (!isNaN(parsed)) {
                // Enforce Max instantly on keystroke
                if (max !== undefined && parsed > max) {
                    parsed = max;
                    setInputValue(String(parsed));
                    onChange(parsed);
                    return;
                }

                setInputValue(raw);
                onChange(parsed);
            }
        }
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        let finalValue = inputValue === '' || inputValue === '-' ? fallbackValue : Number(inputValue);
        
        // Enforce Min on blur (allows user to type "2" before typing "5" for 25)
        if (min !== undefined && finalValue < min) {
            finalValue = min;
        }
        
        // Enforce Max on blur (safety catch)
        if (max !== undefined && finalValue > max) {
            finalValue = max;
        }

        setInputValue(String(finalValue));
        onChange(finalValue);
        
        if (props.onBlur) props.onBlur(e);
    };

    return (
        <input
            type="number" // <--- This enables the native browser arrows/spinners
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            max={max}
            min={min}
            // --- Prevent scroll from changing value ---
            onWheel={(e) => e.currentTarget.blur()}
            {...props}
        />
    );
};