/* src/components/forms/methods/FormSubmitConfig.tsx */
import React from 'react';
import { useFieldArray, Controller } from 'react-hook-form';
import { styles } from '../../../App.styles';
import { ButtonConfigEditor } from '../ButtonConfigEditor';
import { MethodConfigProps } from './LinkRedirectConfig';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

export const FormSubmitConfig: React.FC<MethodConfigProps> = ({
    control,
    register,
    watch,
    setValue,
    getValues,
    prefix = '',
    previewWidth = 100,
    previewOrientation = 'landscape'
}) => {
    const getFieldName = (name: string) => prefix ? `${prefix}.${name}` : name;
    const fieldsName = getFieldName('fields');

    const { fields: formFields, append: appendFormField, move: moveFormField, replace: replaceFormFields } = useFieldArray({ control, name: fieldsName });

    const buttonConfig = watch(getFieldName('buttonConfig')) || {};
    const buttonStyle = watch(getFieldName('buttonStyle')) || {};
    const lightButtonStyle = watch(getFieldName('lightButtonStyle')) || {};

    const getDefaultLabel = (type: string) => {
        switch(type) {
            case 'email': return 'Email Address';
            case 'tel': return 'Phone Number';
            case 'number': return 'Number Input';
            default: return 'First Name';
        }
    };

    const getDefaultPlaceholder = (type: string) => {
        switch(type) {
            case 'email': return 'Enter your email...';
            case 'tel': return 'Enter phone number...';
            case 'number': return 'Enter the quantity...';
            default: return 'Enter first name...';
        }
    };

    const rawHeadline = watch(getFieldName('headline'));
    const rawSubheadline = watch(getFieldName('subheadline'));
    const hasHeadline = !!rawHeadline && rawHeadline !== '<p><br></p>';
    const hasSubheadline = !!rawSubheadline && rawSubheadline !== '<p><br></p>';
    const hasBothText = hasHeadline && hasSubheadline;
    const hasAnyText = hasHeadline || hasSubheadline;

    // --- Helper: Count fields per row for validation ---
    const getFieldsInRow = (rowNum: number) => {
        const currentFields = watch(fieldsName) || [];
        return currentFields.filter((f: any, index: number) => {
            const r = f.row !== undefined ? f.row : (index + 1);
            return Number(r) === rowNum;
        }).length;
    };

    // Calculate Max Columns based on the PASSED Slider Width
    const getMaxColumns = () => {
        const w = previewWidth;
        if (w >= 100) return 4;
        if (w >= 75) return 3;
        if (w >= 50) return 2;
        return 1;
    };

    // --- Helper: Get Next Available Row Number ---
    const getNextRow = () => {
        if (formFields.length === 0) return 1;
        const maxRow = Math.max(...formFields.map((f: any) => f.row || 1));
        return maxRow + 1;
    };

    // --- Helper: Smart Move (Swaps Row Properties) ---
    const handleSmartMove = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= formFields.length) return;

        const currentRow = watch(`${fieldsName}.${index}.row`) || (index + 1);
        const targetRow = watch(`${fieldsName}.${targetIndex}.row`) || (targetIndex + 1);

        setValue(`${fieldsName}.${index}.row`, targetRow);
        setValue(`${fieldsName}.${targetIndex}.row`, currentRow);

        moveFormField(index, targetIndex);
    };

    // --- Helper: Handle Row Change, Compact Gaps, AND Sort List ---
    const handleRowChange = (index: number, newRowStr: string) => {
        const newRow = Number(newRowStr);
        const currentFields = watch(fieldsName) || [];

        const proposedFields = currentFields.map((f: any, i: number) => ({
            ...f,
            row: i === index ? newRow : (f.row || (i + 1))
        }));

        const uniqueRows = Array.from(new Set(proposedFields.map((f: any) => f.row)))
            .sort((a: any, b: any) => a - b);

        const rowMapping: Record<number, number> = {};
        uniqueRows.forEach((r, i) => {
            rowMapping[r as number] = i + 1;
        });

        const updatedFields = proposedFields.map((f: any) => ({
            ...f,
            row: rowMapping[f.row]
        }));

        updatedFields.sort((a: any, b: any) => a.row - b.row);

        replaceFormFields(updatedFields);
    };

    // Smart Remove: Compacts rows if a row becomes empty
    const removeFormField = (indexToRemove: number) => {
        const currentFields = getValues(fieldsName) || [];
        const fieldToRemove = currentFields[indexToRemove];

        if (!fieldToRemove) return;

        const rowOfDeleted = fieldToRemove.row || (indexToRemove + 1);

        const isRowEmptyNow = !currentFields.some((f: any, idx: number) =>
            idx !== indexToRemove && (f.row || (idx + 1)) === rowOfDeleted
        );

        let newFields = [...currentFields];
        newFields.splice(indexToRemove, 1);

        if (isRowEmptyNow) {
            newFields = newFields.map((f: any) => {
                const fRow = f.row || 1;
                if (fRow > rowOfDeleted) {
                    return { ...f, row: fRow - 1 };
                }
                return f;
            });
        }

        replaceFormFields(newFields);
    };

    // --- Auto-Reflow Effect ---
    React.useEffect(() => {
        const maxCols = getMaxColumns();
        const currentFields = getValues(fieldsName);

        if (!currentFields || currentFields.length === 0) return;

        let needsReflow = false;
        const rowCounts: Record<number, number> = {};
        currentFields.forEach((f: any, i: number) => {
            const r = f.row || (i + 1);
            rowCounts[r] = (rowCounts[r] || 0) + 1;
            if (rowCounts[r] > maxCols) needsReflow = true;
        });

        if (!needsReflow) return;

        const rows: Record<number, any[]> = {};
        currentFields.forEach((f: any, i: number) => {
            const r = f.row || (i + 1);
            if (!rows[r]) rows[r] = [];
            rows[r].push(f);
        });

        const sortedRows = Object.keys(rows).map(Number).sort((a,b) => a - b);
        let rowOffset = 0;
        const newFieldList: any[] = [];

        sortedRows.forEach(originalRowKey => {
            const items = rows[originalRowKey];
            const baseTargetRow = originalRowKey + rowOffset;

            for (let i = 0; i < items.length; i += maxCols) {
                const chunk = items.slice(i, i + maxCols);
                const chunkIndex = Math.floor(i / maxCols);

                if (chunkIndex > 0) {
                    rowOffset++;
                }

                const targetRow = baseTargetRow + chunkIndex;

                chunk.forEach(item => {
                    newFieldList.push({ ...item, row: targetRow });
                });
            }
        });

        replaceFormFields(newFieldList);
    }, [previewWidth]); 

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. FORM FIELDS SECTION */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Form Fields</h4>

                {/* GLOBAL FIELD STYLING */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #ddd' }}>
                    <div style={styles.configItem}>
                        <label>Field Border Radius (px)</label>
                        <Controller 
                            name={getFieldName("style.fieldBorderRadius")} 
                            control={control} 
                            defaultValue={6} 
                            render={({ field }) => ( 
                                <SmartNumberInput 
                                    min={0} max={100} 
                                    fallbackValue={0} 
                                    value={field.value ?? 6} 
                                    onChange={val => { if (val > 100) val = 100; if (val < 0) val = 0; field.onChange(val); }} 
                                    style={styles.input} 
                                /> 
                            )} 
                        />
                    </div>
                </div>

                {formFields.map((field: any, index: number) => {
                    const watchedRow = watch(`${fieldsName}.${index}.row`);
                    const rowVal = watchedRow !== undefined ? watchedRow : (index + 1);

                    const allFields = watch(fieldsName);
                    const globalMaxRow = allFields
                        ? Math.max(...allFields.map((f: any, i: number) => f.row || (i + 1)))
                        : formFields.length;

                    const showRowControls = formFields.length >= 2;
                    const maxCols = getMaxColumns();

                    let portraitVisualRow = rowVal;
                    if (previewOrientation === 'portrait' && allFields) {
                         const groups: Record<number, number[]> = {};
                         allFields.forEach((f: any, i: number) => {
                             const r = f.row || (i + 1);
                             if (!groups[r]) groups[r] = [];
                             groups[r].push(i);
                         });

                         let vRowCounter = 0;
                         const sortedRows = Object.keys(groups).map(Number).sort((a,b)=>a-b);

                         for (const r of sortedRows) {
                             const indices = groups[r];
                             const chunkCount = Math.ceil(indices.length / 2);

                             const internalPos = indices.indexOf(index);
                             if (internalPos !== -1) {
                                 const chunkIndex = Math.floor(internalPos / 2);
                                 portraitVisualRow = vRowCounter + chunkIndex + 1;
                                 break;
                             }
                             vRowCounter += chunkCount;
                         }
                    }

                    return (
                        <div key={field.id} style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={styles.configRow}>
                                    <div style={styles.configItem}>
                                        <label>Type</label>
                                        <select 
                                            {...register(`${fieldsName}.${index}.type`, {
                                                onChange: (e) => {
                                                    const newType = e.target.value;
                                                    // Auto-update label and placeholder when type changes
                                                    setValue(`${fieldsName}.${index}.label`, getDefaultLabel(newType));
                                                    setValue(`${fieldsName}.${index}.placeholder`, getDefaultPlaceholder(newType));
                                                }
                                            })} 
                                            style={styles.input}
                                        >
                                            <option value="text">Text</option>
                                            <option value="email">Email</option>
                                            <option value="tel">Phone</option>
                                            <option value="number">Number</option>
                                        </select>
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Label</label>
                                        <input 
                                            {...register(`${fieldsName}.${index}.label`, {
                                                onBlur: (e) => {
                                                    if (e.target.value.trim() === '') {
                                                        setValue(`${fieldsName}.${index}.label`, getDefaultLabel(watch(`${fieldsName}.${index}.type`) || 'text'));
                                                    }
                                                }
                                            })} 
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                                <div style={styles.configItem}>
                                    <label>Placeholder</label>
                                    <input 
                                        {...register(`${fieldsName}.${index}.placeholder`, {
                                            onBlur: (e) => {
                                                if (e.target.value.trim() === '') {
                                                    setValue(`${fieldsName}.${index}.placeholder`, getDefaultPlaceholder(watch(`${fieldsName}.${index}.type`) || 'text'));
                                                }
                                            }
                                        })} 
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            {/* ROW SELECTION & REORDER */}
                            {showRowControls && (
                                <div style={{...styles.configRow, marginBottom: '0.75rem', alignItems: 'flex-start'}}>
                                    <div style={styles.configItem}>
                                        <label>Row</label>
                                        <select
                                            value={rowVal}
                                            onChange={(e) => handleRowChange(index, e.target.value)}
                                            style={styles.input}
                                        >
                                            {formFields.map((_, i) => {
                                                const optionRowNum = i + 1;
                                                const currentCount = getFieldsInRow(optionRowNum);
                                                const isCurrentRow = rowVal === optionRowNum;
                                                const isFull = !isCurrentRow && currentCount >= maxCols;

                                                let maxOption = globalMaxRow + 1;
                                                const isLastRow = rowVal === globalMaxRow;
                                                const isAloneInRow = getFieldsInRow(rowVal) === 1;

                                                if (isLastRow && isAloneInRow) {
                                                    maxOption = globalMaxRow;
                                                }

                                                if (optionRowNum > maxOption) return null;

                                                let label = `Row ${optionRowNum}`;
                                                if (isFull) label += ` (Full - Max ${maxCols})`;
                                                if (optionRowNum > globalMaxRow) label += ` (New)`;

                                                return (
                                                    <option key={optionRowNum} value={optionRowNum} disabled={isFull}>
                                                        {label}
                                                    </option>
                                                );
                                            })}
                                        </select>

                                        {previewOrientation === 'portrait' && portraitVisualRow !== rowVal && (
                                            <div style={{ fontSize: '0.8rem', color: '#f39c12', marginTop: '4px', fontWeight: 500 }}>
                                                Shifted to Row {portraitVisualRow}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '24px' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleSmartMove(index, 'up')}
                                            disabled={index === 0}
                                            style={{ ...styles.secondaryButton, padding: '0.5rem', opacity: index === 0 ? 0.5 : 1 }}
                                            title="Move Up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSmartMove(index, 'down')}
                                            disabled={index === formFields.length - 1}
                                            style={{ ...styles.secondaryButton, padding: '0.5rem', opacity: index === formFields.length - 1 ? 0.5 : 1 }}
                                            title="Move Down"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                                    <input type="checkbox" {...register(`${fieldsName}.${index}.required`)} defaultChecked={true} />
                                    Required Field
                                </label>
                                <button
                                    type="button"
                                    onClick={() => removeFormField(index)}
                                    style={{ ...styles.deleteButton, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                    title="Remove Field"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button
                    type="button"
                    onClick={() => appendFormField({ label: 'First Name', placeholder: 'Enter first name...', type: 'text', required: true, name: `field_${Date.now()}`, row: getNextRow() })}
                    style={{ ...styles.secondaryButton, width: '100%', justifyContent: 'center' }}
                >
                    + Add Field
                </button>
            </div>

            {/* 2. VERTICAL SPACING */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Vertical Spacing</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {hasBothText && (
                        <div style={styles.configItem}>
                            <label>Between Text (px)</label>
                            <Controller name={getFieldName("style.textSpacing")} control={control} defaultValue={10} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 10} onChange={field.onChange} style={styles.input} /> )} />
                        </div>
                    )}
                    {hasAnyText && (
                        <div style={styles.configItem}>
                            <label>Between Method & Text (px)</label>
                            <Controller name={getFieldName("style.methodSpacing")} control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={field.onChange} style={styles.input} /> )} />
                        </div>
                    )}
                    <div style={styles.configItem}>
                        <label>Between Form Fields (px)</label>
                        <Controller name={getFieldName("style.fieldSpacing")} control={control} defaultValue={10} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 10} onChange={field.onChange} style={styles.input} /> )} />
                    </div>
                    <div style={styles.configItem}>
                        <label>Between Fields & Button (px)</label>
                        <Controller name={getFieldName("style.buttonSpacing")} control={control} defaultValue={15} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 15} onChange={field.onChange} style={styles.input} /> )} />
                    </div>
                </div>
            </div>

            {/* 3. SUBMIT BUTTON SECTION (USING NEW BUTTON ENGINE) */}
            <ButtonConfigEditor
                title="Submit Button"
                config={buttonConfig}
                darkTheme={buttonStyle}
                lightTheme={lightButtonStyle}
                defaultText="Submit"
                onChangeConfig={(key, value) => setValue(getFieldName(`buttonConfig.${key}`), value, { shouldDirty: true, shouldTouch: true })}
                onChangeTheme={(mode, key, value) => {
                    const themeKey = mode === 'dark' ? 'buttonStyle' : 'lightButtonStyle';
                    setValue(getFieldName(`${themeKey}.${key}`), value, { shouldDirty: true, shouldTouch: true });
                }}
            />
        </div>
    );
};