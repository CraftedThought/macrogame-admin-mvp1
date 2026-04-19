// src/components/modals/MicrogameCustomizerModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { notifications } from '../../utils/notifications';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';
import { SKINNABLE_ELEMENTS } from '../../constants';
import { Modal } from '../ui/Modal';

interface MicrogameCustomizerModalProps {
    microgame: Microgame | null;
    existingVariant?: CustomMicrogame | null;
    onClose: () => void;
    onSave: (baseGame: Microgame, variantName: string, skinFiles: { [key: string]: File }, existingVariant?: CustomMicrogame) => Promise<void>;
}

export const MicrogameCustomizerModal: React.FC<MicrogameCustomizerModalProps> = ({ microgame, existingVariant, onClose, onSave }) => {
    const [variantName, setVariantName] = useState('');
    const [skinFiles, setSkinFiles] = useState<{ [key: string]: File | null }>({}); // For file upload
    const [skinFilePreviews, setSkinFilePreviews] = useState<{ [key: string]: string }>({}); // For thumbnail preview
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (microgame) {
            setVariantName(existingVariant ? existingVariant.name : `${microgame.name} - Custom`);
            setSkinFiles({});
            setSkinFilePreviews({});
        }
    }, [microgame, existingVariant]);

    const handleFileChange = (elementId: string, file: File | null) => {
        // Update the file state for upload
        setSkinFiles(prev => ({ ...prev, [elementId]: file }));

        // Update the preview URL state for display
        setSkinFilePreviews(prev => {
            const newPreviews = { ...prev };

            // If a preview URL already exists, revoke it to prevent memory leaks
            if (newPreviews[elementId]) {
                URL.revokeObjectURL(newPreviews[elementId]);
            }

            // Create a new preview URL
            if (file) {
                newPreviews[elementId] = URL.createObjectURL(file);
            } else {
                delete newPreviews[elementId]; // Clear the preview if file is removed
            }
            return newPreviews;
        });
    };

    const handleSave = async () => {
        if (!microgame || !variantName.trim()) { notifications.error('Please provide a name for your custom variant.'); return; }
        
        // 1. Start loading toast (Keep this for the upload duration, which is real work)
        const loadingToast = notifications.loading('Saving variant...');
        setIsLoading(true);

        const filesToUpload = Object.entries(skinFiles).reduce((acc, [key, file]) => {
            if (file) acc[key] = file;
            return acc;
        }, {} as { [key: string]: File });

        try {
            // 2. Perform the save/upload
            await onSave(microgame, variantName, filesToUpload, existingVariant || undefined);
            
            // 3. Dismiss immediately (No delay)
            notifications.dismiss(loadingToast);
            
            // 4. Close Modal
            onClose();
            
        } catch (error) {
            notifications.dismiss(loadingToast);
            console.error("Failed to save custom microgame:", error);
            notifications.error("An error occurred while saving.");
        } finally {
            setIsLoading(false);
        }
    };

    // Clean up object URLs on unmount
    useEffect(() => {
        return () => {
            Object.values(skinFilePreviews).forEach(url => URL.revokeObjectURL(url));
        };
    }, [skinFilePreviews]);

    if (!microgame) return null;

    const modalTitle = existingVariant ? `Edit '${existingVariant.name}'` : `Customize '${microgame.name}'`;
    const modalFooter = (
        <>
            <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button onClick={handleSave} style={styles.saveButton} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Variant'}</button>
        </>
    );

    return (
        <Modal isOpen={!!microgame} onClose={onClose} title={modalTitle} footer={modalFooter} size="small">
            <div>
                <div style={styles.configItem}><label>Variant Name</label><input type="text" value={variantName} onChange={e => setVariantName(e.target.value)} style={styles.input} /></div>
                <div style={{ borderTop: '1px solid #eee', marginTop: '2rem', paddingTop: '1.5rem' }}>
                    <h4 style={{...styles.h4, marginTop: 0}}>Skinnable Elements</h4>
                    <p style={styles.descriptionText}>
                        Upload new assets (SVG, PNG, JPG) or leave fields blank to keep existing ones.
                    </p>

                    {(SKINNABLE_ELEMENTS[microgame.id.toLowerCase()] || []).length > 0 ? (
                        (SKINNABLE_ELEMENTS[microgame.id.toLowerCase()] || []).map(element => {
                            // Determine the URL to show in the preview
                            const newPreviewUrl = skinFilePreviews[element.id];
                            const existingPreviewUrl = existingVariant?.skinData[element.id]?.url;
                            const previewUrl = newPreviewUrl || existingPreviewUrl;

                            // Dynamically set aspect ratio for the preview box
                            const aspectR = element.aspectRatio?.split(':').map(Number);
                            const previewBoxStyle: React.CSSProperties = {
                                width: '100%', // 100% of its 150px wrapper
                                height: '100px', // Default height
                                border: '2px dashed #ccc',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f9f9f9',
                                overflow: 'hidden',
                                position: 'relative' // Required for padding trick and absolute child
                            };

                            // If aspect ratio is defined, use it to set the height relative to width
                            if (aspectR && aspectR.length === 2 && aspectR[0] > 0) {
                                // We use paddingBottom trick for aspect ratio, so height must be 0
                                previewBoxStyle.height = 0;
                                previewBoxStyle.paddingBottom = `${(aspectR[1] / aspectR[0]) * 100}%`;
                            }

                            const previewImgStyle: React.CSSProperties = {
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                // Fill the box
                                position: 'absolute',
                                top: 0,
                                left: 0,
                            };

                            return (
                                <div style={{...styles.configItem, marginTop: '1rem'}} key={element.id}>
                                    <label>{element.name}</label>
                                    {/* --- 1. RECOMMENDATION --- */}
                                    {element.recommendation && (
                                        <p style={{...styles.descriptionText, fontSize: '0.8rem', marginTop: '0.25rem', marginBottom: '0.5rem'}}>
                                            {element.recommendation}
                                        </p>
                                    )}

                                    {/* --- 2. INPUT (MOVED UP) --- */}
                                    {existingVariant?.skinData[element.id] && !newPreviewUrl && (
                                        <div style={{fontSize: '0.8rem', color: '#606770', marginTop: '0.25rem'}}>
                                            Current: <a href={existingVariant.skinData[element.id].url} target="_blank" rel="noopener noreferrer">{existingVariant.skinData[element.id].fileName}</a>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/svg+xml,image/png,image/jpeg" 
                                        onChange={e => handleFileChange(element.id, e.target.files ? e.target.files[0] : null)} 
                                        style={{...styles.input, marginTop: '0.5rem'}} 
                                    />

                                    {/* --- 3. PREVIEW BOX (MOVED DOWN & RESIZED) --- */}
                                    <div style={{ width: '150px', marginTop: '0.5rem' }}>
                                        <div style={previewBoxStyle}>
                                            {previewUrl ? (
                                                <img src={previewUrl} style={previewImgStyle} alt={`${element.name} preview`} />
                                            ) : (
                                                <span style={{color: '#999', fontSize: '0.9rem'}}>No Image</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p>This microgame does not have any skinnable elements defined yet.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};