/* src/components/modals/EditConversionScreenModal.tsx */

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionScreen } from '../../types';
import { Modal } from '../ui/Modal';
import { generateUUID } from '../../utils/helpers';
import { useData } from '../../hooks/useData';
import { StaticConversionPreview } from '../previews/StaticConversionPreview';

interface EditConversionScreenModalProps {
    isOpen: boolean;
    onClose: () => void;
    screen: ConversionScreen | null;
    onSave: (screenId: string, data: Partial<Omit<ConversionScreen, 'id'>>) => Promise<void>;
}

type ScreenFormInputs = Partial<Omit<ConversionScreen, 'id'>>;

// --- Helper: Toggle Switch Component ---
const ToggleSwitch: React.FC<{ isChecked: boolean; onChange: (checked: boolean) => void; label: string }> = ({ isChecked, onChange, label }) => (
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: '#aaa', fontSize: '0.9rem', marginRight: '0.5rem' }}>{label}</span>
        <div style={{ position: 'relative', width: '40px', height: '20px', backgroundColor: isChecked ? '#4CAF50' : '#ccc', borderRadius: '10px', transition: 'background-color 0.2s' }}>
            <input type="checkbox" checked={isChecked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ 
                position: 'absolute', top: '2px', left: isChecked ? '22px' : '2px', 
                width: '16px', height: '16px', backgroundColor: 'white', 
                borderRadius: '50%', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
            }} />
        </div>
    </label>
);

export const EditConversionScreenModal: React.FC<EditConversionScreenModalProps> = ({ isOpen, onClose, screen, onSave }) => {
    const { allConversionMethods } = useData();
    const [isLivePreview, setIsLivePreview] = useState(false);

    const { register, handleSubmit, reset, control, watch, setValue } = useForm<ScreenFormInputs>({
        defaultValues: { methods: [] }
    });

    const { fields, append, remove, move, replace } = useFieldArray({ control, name: "methods", keyName: "key" });
    
    // Watch fields for preview construction
    const watchedValues = watch();
    const watchedMethods = watchedValues.methods || [];

    useEffect(() => {
        if (screen) {
            // "Clean" the data by ensuring every method has an instanceId
            const cleanedMethods = (screen.methods || []).map(method => ({
                ...method,
                // If instanceId is missing on an old method, generate a new one
                instanceId: method.instanceId || generateUUID(),
                // Ensure gate object exists if a type is set, for form compatibility
                gate: method.gate ? {
                    type: method.gate.type || 'on_success', // Default to 'on_success' if type is missing
                    methodInstanceId: method.gate.methodInstanceId
                } : {
                    type: 'none' // Default to 'none'
                }
            }));

            const screenWithCleanedMethods = { ...screen, methods: cleanedMethods };

            // Populate the form with the clean, upgraded data
            reset(screenWithCleanedMethods);
            replace(screenWithCleanedMethods.methods);
        } else {
            setIsLivePreview(false); // Reset preview state on new open
        }
    }, [screen, reset, replace]);

    const handleSave: SubmitHandler<ScreenFormInputs> = async (data) => {
        if (!screen) return;

        const finalData: Partial<Omit<ConversionScreen, 'id'>> = {
            name: data.name,
            headline: data.headline,
            bodyText: data.bodyText,
            layout: data.layout,
            methods: (data.methods || []).map(method => {
                // Create a clean copy to ensure we have all properties
                const newMethod = { ...method };
                
                // If the gate type is 'none' or doesn't exist, delete the gate property
                if (!newMethod.gate || newMethod.gate.type === 'none') {
                    delete newMethod.gate;
                } 
                // If it's 'on_points', keep the gate but remove methodInstanceId
                else if (newMethod.gate.type === 'on_points') {
                    delete newMethod.gate.methodInstanceId;
                }
                // If it's 'on_success' but no method is selected, delete the gate
                else if (newMethod.gate.type === 'on_success' && !newMethod.gate.methodInstanceId) {
                    delete newMethod.gate;
                }

                return newMethod;
            })
        };

        await onSave(screen.id, finalData);
    };

    // Construct preview object from form state
    const previewScreen = useMemo(() => {
        return {
            id: 'preview',
            name: watchedValues.name || 'Preview',
            headline: watchedValues.headline || '',
            bodyText: watchedValues.bodyText || '',
            layout: watchedValues.layout || 'single_column',
            // Map form methods to the structure expected by ConversionScreen
            methods: (watchedValues.methods || []).map(m => ({
                instanceId: m?.instanceId || 'temp',
                methodId: m?.methodId || '',
                gate: m?.gate
            })),
            // Pass minimal status
            status: { code: 'ok', message: '' }
        } as ConversionScreen;
    }, [watchedValues]);

    const finalModalSize = isLivePreview ? 'large' : 'medium';

    const modalFooter = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ minWidth: '150px' }}>
                <ToggleSwitch isChecked={isLivePreview} onChange={setIsLivePreview} label="Live Preview" />
            </div>
            <div>
                <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                <button type="submit" form="edit-screen-form" style={{ ...styles.saveButton, marginLeft: '1rem' }}>Save Changes</button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Conversion Screen" footer={modalFooter} size={finalModalSize}>
            <div style={{ display: 'flex', gap: '1rem', height: isLivePreview ? 'calc(80vh - 150px)' : 'auto' }}>
                
                {/* FORM COLUMN */}
                <div style={{ flex: isLivePreview ? '1 1 40%' : '1 1 100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <form id="edit-screen-form" onSubmit={handleSubmit(handleSave)}>
                        <div style={styles.configItem}><label>Internal Name</label><input type="text" {...register("name")} style={styles.input} /></div>
                        
                        <h4 style={{...styles.h4, marginTop: '2rem'}}>Screen Content & Styling</h4>
                        <div style={styles.configRow}>
                            <div style={styles.configItem}><label>Headline</label><input type="text" {...register("headline")} style={styles.input} /></div>
                            <div style={styles.configItem}><label>Body Text</label><input type="text" {...register("bodyText")} style={styles.input} /></div>
                            <div style={styles.configItem}><label>Layout</label><select {...register("layout")} style={styles.input}><option value="single_column">Single Column</option></select></div>
                        </div>
                        
                        <h4 style={{...styles.h4, marginTop: '2rem'}}>Conversion Methods</h4>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {fields.map((field, index) => {
                                const availableGates = watchedMethods.filter((_, i) => i < index);
                                const selectedMethodId = watch(`methods.${index}.methodId`);
                                const selectedMethod = allConversionMethods.find(m => m.id === selectedMethodId);
                                const gateType = watch(`methods.${index}.gate.type`);
                                
                                return (
                                     <div key={field.key} style={{border: '1px solid #ccc', borderRadius: '8px', padding: '1rem'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                            <strong style={{fontSize: '1.1rem'}}>Method {index + 1}: {selectedMethod?.name || 'New Method'}</strong>
                                            <div>
                                                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} style={styles.flowCardButton}>▲</button>
                                                <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} style={styles.flowCardButton}>▼</button>
                                                <button type="button" onClick={() => remove(index)} style={{...styles.deleteButton, marginLeft: '1rem'}}>Remove</button>
                                            </div>
                                        </div>
                                        <div style={styles.configRow}>
                                            <div style={styles.configItem}>
                                                <label>Method</label>
                                                <select {...register(`methods.${index}.methodId`)} style={styles.input}>
                                                    <option value="">Select a method...</option>
                                                    {allConversionMethods.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type.replace(/_/g, ' ')})</option>)}
                                                </select>
                                            </div>
                                            <div style={styles.configItem}>
                                                <label>Gate Type (Locked Offer)</label>
                                                <select 
                                                    {...register(`methods.${index}.gate.type`)} 
                                                    style={styles.input}
                                                    defaultValue="none"
                                                    onChange={(e) => {
                                                        setValue(`methods.${index}.gate.type`, e.target.value as 'none' | 'on_success' | 'on_points');
                                                        if (e.target.value !== 'on_success') {
                                                            setValue(`methods.${index}.gate.methodInstanceId`, undefined);
                                                        }
                                                    }}
                                                >
                                                    <option value="none">None (Always Visible)</option>
                                                    <option value="on_success">On Method Success</option>
                                                    <option value="on_points">On Point Threshold</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {gateType === 'on_success' && (
                                            <div style={{...styles.configItem, marginTop: '1rem'}}>
                                                <label>Select Prerequisite Method</label>
                                                <select {...register(`methods.${index}.gate.methodInstanceId`)} style={styles.input}>
                                                    <option value="">Select a method to complete...</option>
                                                    {availableGates.map((gateField, gateIndex) => (
                                                        <option key={gateField.instanceId || gateIndex} value={gateField.instanceId}>
                                                            Method {watchedMethods.findIndex(f => f.instanceId === gateField.instanceId) + 1}: {allConversionMethods.find(m => m.id === gateField.methodId)?.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button type="button" onClick={() => append({ instanceId: generateUUID(), methodId: '', gate: { type: 'none' } })} style={{...styles.secondaryButton, marginTop: '1rem'}}>Add New Method</button>
                    </form>
                </div>

                {/* PREVIEW COLUMN */}
                {isLivePreview && (
                    <div style={{ flex: '1 1 60%', paddingLeft: '1rem', borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
                        <StaticConversionPreview screen={previewScreen} />
                    </div>
                )}
            </div>
        </Modal>
    );
};