// src/components/ui/FilterBar.tsx

import React, { useState, useRef, useEffect } from 'react';
import { styles } from '../../App.styles';

// Define the shape for different filter types
type SelectFilterOption = string | { value: string; label: string };
type SelectFilterGroup = { group: string; options: SelectFilterOption[] };

type SelectFilter = {
    type: 'select';
    stateKey: string;
    label: string;
    options: (SelectFilterOption | SelectFilterGroup)[];
};

export type MultiSelectOption = { value: string; label: string; isExclusive?: boolean };
export type MultiSelectGroup = { group: string; options: MultiSelectOption[] };

type MultiSelectFilter = {
    type: 'multiselect';
    stateKey: string;
    label: string;
    options: (MultiSelectOption | MultiSelectGroup)[];
};

export type FilterConfig = SelectFilter | MultiSelectFilter;

interface FilterBarProps {
    filters: FilterConfig[];
    filterValues: { [key: string]: any };
    onFilterChange: (key: string, value: string | string[]) => void;
    onResetFilters: () => void;
}

const MultiSelectDropdown: React.FC<{ filter: MultiSelectFilter, value: string[], onChange: (value: string[]) => void }> = ({ filter, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (optionValue: string, isExclusive: boolean = false) => {
        if (isExclusive) {
            onChange([optionValue]);
            setIsOpen(false); // Auto-close for single-select behavior
            return;
        }

        // Get all exclusive values for this filter to filter them out
        const exclusiveValues = filter.options.flatMap(o => {
            if ('group' in o) return o.options.filter(so => so.isExclusive).map(so => so.value);
            return o.isExclusive ? [o.value] : [];
        });

        let newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];

        // Remove any exclusive values if a standard checkbox is toggled
        newValue = newValue.filter(v => !exclusiveValues.includes(v));

        onChange(newValue);
    };

    // Say "All" when empty, or list the count when items are selected.
    let buttonText = 'All';
    if (value.length > 0) {
        let isExclusive = false;
        let selectedLabel = '';
        if (value.length === 1) {
            for (const option of filter.options) {
                if ('group' in option) {
                    const match = option.options.find(o => o.value === value[0]);
                    if (match?.isExclusive) { isExclusive = true; selectedLabel = match.label; break; }
                } else {
                    if (option.value === value[0] && option.isExclusive) { isExclusive = true; selectedLabel = option.label; break; }
                }
            }
        }
        buttonText = isExclusive ? selectedLabel : `${value.length} selected`;
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} style={{ ...styles.input, textAlign: 'left', width: '100%' }}>
                {buttonText}
            </button>
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {filter.options.map((option, index) => {
                        // Render Group Header & Children
                        if ('group' in option) {
                            return (
                                <div key={`group-${index}`}>
                                    <div style={{ padding: '0.4rem 1rem', fontWeight: 'bold', backgroundColor: '#f4f5f7', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {option.group}
                                    </div>
                                    {option.options.map(subOption => (
                                        <div key={subOption.value} style={{ padding: '0.5rem 1rem 0.5rem 1.5rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                                            <input
                                                type="checkbox"
                                                id={`${filter.stateKey}-${subOption.value}`}
                                                checked={value.includes(subOption.value)}
                                                onChange={() => handleSelect(subOption.value)}
                                                style={{ marginRight: '0.75rem' }}
                                            />
                                            <label htmlFor={`${filter.stateKey}-${subOption.value}`} style={{ flex: 1, fontSize: '0.9rem', cursor: 'pointer' }}>{subOption.label}</label>
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        
                        // Render Standard Flat Option
                        if (option.isExclusive) {
                            return (
                                <div 
                                    key={option.value} 
                                    onClick={() => handleSelect(option.value, true)} 
                                    style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid #ddd', cursor: 'pointer', backgroundColor: value.includes(option.value) ? '#eaf5fc' : '#f9f9f9' }}
                                >
                                    <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: value.includes(option.value) ? 'bold' : 'normal', color: value.includes(option.value) ? '#084298' : '#333' }}>
                                        {option.label}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={option.value} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                                <input
                                    type="checkbox"
                                    id={`${filter.stateKey}-${option.value}`}
                                    checked={value.includes(option.value)}
                                    onChange={() => handleSelect(option.value)}
                                    style={{ marginRight: '0.75rem', cursor: 'pointer' }}
                                />
                                <label htmlFor={`${filter.stateKey}-${option.value}`} style={{ flex: 1, fontSize: '0.9rem', cursor: 'pointer' }}>{option.label}</label>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};


export const FilterBar: React.FC<FilterBarProps> = ({ filters, filterValues, onFilterChange, onResetFilters }) => {
    return (
        <div style={styles.filterBarContainer}>
            <h4 style={{ ...styles.h4, width: '100%', marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
                Filters
            </h4>

            {filters.map(filter => (
                <div key={filter.stateKey} style={styles.filterItem}>
                    <label style={styles.filterLabel}>{filter.label}</label>
                    {filter.type === 'select' ? (
                        <select
                            value={filterValues[filter.stateKey] as string}
                            onChange={e => onFilterChange(filter.stateKey, e.target.value)}
                            style={styles.input}
                        >
                            {filter.options?.map((option, index) => {
                                if (typeof option === 'string') {
                                    return <option key={`${option}-${index}`} value={option}>{option}</option>;
                                }
                                if ('group' in option) {
                                    return (
                                        <optgroup label={option.group} key={`${option.group}-${index}`}>
                                            {option.options.map((subOption, subIndex) => {
                                                const value = typeof subOption === 'string' ? subOption : subOption.value;
                                                const label = typeof subOption === 'string' ? subOption : subOption.label;
                                                return <option key={`${value}-${subIndex}`} value={value}>{label}</option>;
                                            })}
                                        </optgroup>
                                    );
                                }
                                return <option key={`${option.value}-${index}`} value={option.value}>{option.label}</option>;
                            })}
                        </select>
                    ) : (
                        <MultiSelectDropdown
                            filter={filter}
                            value={filterValues[filter.stateKey] as string[]}
                            onChange={(value) => onFilterChange(filter.stateKey, value)}
                        />
                    )}
                </div>
            ))}
            <button type="button" onClick={onResetFilters} style={{...styles.resetButton, alignSelf: 'flex-end', marginBottom: '0.2rem' }}>
                Reset Filters
            </button>
        </div>
    );
};