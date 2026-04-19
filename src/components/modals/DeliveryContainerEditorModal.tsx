/* src/components/modals/DeliveryContainerEditorModal.tsx */

import React, { useState, useEffect, useCallback } from 'react';
// --- Import new types and StaticSkinPreview ---
import {
    DeliveryContainer,
    Macrogame,
    SkinConfig,
    SkinContentBlock, // Needed for defaultSkinConfig logic
} from '../../types';
import { Modal } from '../ui/Modal';
import { DeliveryContainerEditorFormFields } from "./DeliveryContainerEditorFormFields";
import { StaticSkinPreview } from '../previews/StaticSkinPreview'; // <-- NEW IMPORT
import { styles } from '../../App.styles';
import { generateUUID } from '../../utils/helpers'; // <-- NEW IMPORT

// --- NEW: Default state for a new skin configuration (Lifted from FormFields) ---
const defaultSkinConfig: SkinConfig = {
    showMuteButton: true,
    showExitButton: true,
    muteButtonPosition: 'left',
    header: {
        title: 'Popup Title',
        textColor: '#FFFFFF',
        // Default Header Padding: 0px Top (to balance border), 10px Bottom/Sides
        paddingTop: 0,
        paddingBottom: 10,
        paddingX: 0
    },
    contentBlocks: [],
    styling: {
        backgroundColor: '#292929',
        popupWidth: 'medium',
        borderRadius: 8,
        boxShadowStrength: 50,
        padding: 10, // Default General Padding
    }
};

// --- REFACTOR: Rename interface and update types ---
interface DeliveryContainerEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    container: DeliveryContainer | null;
    onSave: (containerId: string, dataToUpdate: Partial<DeliveryContainer>) => Promise<void>;
    macrogames: Macrogame[];
}

// --- NEW: Component for the toggle switch in the footer ---
const ToggleSwitch: React.FC<{ isChecked: boolean; onChange: (checked: boolean) => void; label: string }> = ({ isChecked, onChange, label }) => {
    return (
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ color: '#aaa', fontSize: '0.9rem', marginRight: '0.5rem' }}>{label}</span>
            <div style={{ position: 'relative', width: '40px', height: '20px', backgroundColor: isChecked ? '#4CAF50' : '#ccc', borderRadius: '10px', transition: 'background-color 0.2s' }}>
                <input type="checkbox" checked={isChecked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ 
                    position: 'absolute', 
                    top: '2px', 
                    left: isChecked ? '22px' : '2px', 
                    width: '16px', 
                    height: '16px', 
                    backgroundColor: 'white', 
                    borderRadius: '50%', 
                    transition: '0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                }} />
            </div>
        </label>
    );
};


// --- REFACTOR: Rename component ---
export const DeliveryContainerEditorModal: React.FC<DeliveryContainerEditorModalProps> = ({ isOpen, onClose, container, onSave, macrogames }) => {
    // --- LIFTED STATE FROM FORMFILDS ---
    const [name, setName] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('popup_modal');
    const [macrogameId, setMacrogameId] = useState('');
    const [skinId, setSkinId] = useState('');
    const [skinConfig, setSkinConfig] = useState<SkinConfig>(defaultSkinConfig);
    // --- NEW: Live Preview Toggle State ---
    const [isLivePreview, setIsLivePreview] = useState(false);
    // --- END LIFTED STATE ---

    // --- REFACTOR: Consolidated Data Preparation ---
    useEffect(() => {
        if (isOpen && container) {
            setName(container.name || '');
            setDeliveryMethod(container.deliveryMethod || 'popup_modal');
            setMacrogameId(container.macrogameId || '');
            setSkinId(container.skinId || '');

            // Merge saved skinConfig with defaults, ensuring nested objects are also merged
            const initial = container.skinConfig || {};
            setSkinConfig({
                ...defaultSkinConfig,
                ...initial,
                showMuteButton: initial.showMuteButton ?? true,
                showExitButton: initial.showExitButton ?? true,
                header: { ...defaultSkinConfig.header, ...initial.header },
                styling: { ...defaultSkinConfig.styling, ...initial.styling },
                contentBlocks: initial.contentBlocks || [],
            });
            // Reset preview mode if a non-configurable skin is selected
            if (container.skinId !== 'configurable-popup') {
                setIsLivePreview(false);
            }
            
        } else if (!isOpen) {
            // Clear data and state on close
            setName('');
            setMacrogameId('');
            setSkinId('');
            setIsLivePreview(false);
            setSkinConfig(defaultSkinConfig);
        }
    }, [isOpen, container]);
    
    // --- onFormSave Function (Passed down to child form) ---
    const onFormSave = useCallback(async (containerId: string, dataToUpdate: { macrogameId: string, macrogameName: string }) => {
        const selectedMacrogame = macrogames.find(mg => mg.id === dataToUpdate.macrogameId);

        // --- Sanitize Skin Config for Firestore ---
        // Ensure no 'undefined' values exist in the nested object
        let sanitizedSkinConfig: SkinConfig | undefined = undefined;
        
        if (skinId === 'configurable-popup' && skinConfig) {
            sanitizedSkinConfig = JSON.parse(JSON.stringify(skinConfig)); // Deep clone to break reference
            
            // Explicitly ensure gameSection values are valid for Firestore
            if (sanitizedSkinConfig?.styling?.gameSection) {
                const gs = sanitizedSkinConfig.styling.gameSection;
                // Replace undefined with null
                if (gs.leftContent === undefined) gs.leftContent = null as any;
                if (gs.rightContent === undefined) gs.rightContent = null as any;
                if (gs.desktopHeightLimit === undefined) gs.desktopHeightLimit = null as any;
            }
        }

        // --- IMPORTANT: Build the final object here using modal's state ---
        const finalData: Partial<DeliveryContainer> = {
            name,
            deliveryMethod,
            macrogameId: dataToUpdate.macrogameId,
            macrogameName: dataToUpdate.macrogameName,
            skinId,
            // Pass the sanitized config
            skinConfig: sanitizedSkinConfig,
            
            // Nullify deprecated fields to clean up Firestore
            title: null,
            subtitle: null,
            colorScheme: null
        };
        
        await onSave(containerId, finalData);
        onClose(); // Close the modal after successful save
    }, [name, deliveryMethod, macrogameId, skinId, skinConfig, macrogames, onSave, onClose]);
    // --- END onFormSave ---


    if (!isOpen || !container) return null;

    // --- NEW: Toggle Logic ---
    const isConfigurableSkin = skinId === 'configurable-popup';
    const finalModalSize = isLivePreview && isConfigurableSkin ? 'large' : 'small';


    const modalFooter = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            {/* --- TOGGLE SWITCH --- */}
            <div style={{ minWidth: '150px', visibility: isConfigurableSkin ? 'visible' : 'hidden' }}>
                <ToggleSwitch 
                    isChecked={isLivePreview} 
                    onChange={setIsLivePreview} 
                    label="Live Preview" 
                />
            </div>
            
            {/* --- ACTION BUTTONS --- */}
            <div>
                <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                <button type="button" onClick={() => document.getElementById('container-editor-save-button')?.click()} style={{ ...styles.saveButton, marginLeft: '1rem' }}>Save Changes</button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Container: ${container.name}`} size={finalModalSize} footer={modalFooter}>
            
            {/* --- NEW: SPLIT SCREEN LAYOUT --- */}
            {/* We calculate 90vh (Modal Max) - ~240px (Header + Footer + Padding) to fit perfectly without body scroll */}
            <div style={{ display: 'flex', gap: '1rem', height: finalModalSize === 'large' ? 'calc(90vh - 250px)' : 'auto' }}>
                
                {/* 1. FORM SECTION (Always visible) */}
                <div style={{ flex: finalModalSize === 'large' ? '1 1 30%' : '1 1 100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <DeliveryContainerEditorFormFields
                        // Pass all state and handlers down to the dumb component
                        containerId={container.id}
                        onFormSave={onFormSave} // New Save Handler
                        macrogames={macrogames}
                        
                        // Pass State and Setters (Lifting State Pattern)
                        name={name} setName={setName}
                        deliveryMethod={deliveryMethod} setDeliveryMethod={setDeliveryMethod} // Disabled for now, but keeping prop signature
                        macrogameId={macrogameId} setMacrogameId={setMacrogameId}
                        skinId={skinId} setSkinId={setSkinId}
                        skinConfig={skinConfig} setSkinConfig={setSkinConfig}
                    />
                </div>
                
                {/* 2. PREVIEW SECTION (Visible only if toggle is ON and correct skin is selected) */}
                {isLivePreview && isConfigurableSkin && (
                    <div style={{ flex: '1 1 70%', overflowY: 'hidden', paddingLeft: '1rem', borderLeft: '1px solid #eee' }}>
                        <StaticSkinPreview 
                            skinId={skinId} 
                            skinConfig={skinConfig} 
                        />
                    </div>
                )}
            </div>
            {/* --- END SPLIT SCREEN LAYOUT --- */}

        </Modal>
    );
};