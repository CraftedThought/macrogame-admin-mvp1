/* src/components/modals/DeliveryContainerEditorFormFields.tsx */

import React from 'react';
import { notifications } from '../../utils/notifications';
import { styles } from '../../App.styles';
import {
    Macrogame,
    SkinConfig
} from '../../types';
import { UI_SKINS } from '../../constants';
import { useData } from '../../hooks/useData';
import { hasMacrogameIssues } from '../../utils/helpers';
import { PopupSkinForm } from "../forms/PopupSkinForm";

interface DeliveryContainerEditorFormFieldsProps {
    containerId: string;
    onFormSave: (containerId: string, dataToUpdate: { macrogameId: string, macrogameName: string }) => Promise<void>;
    macrogames: Macrogame[];
    name: string; setName: (name: string) => void;
    deliveryMethod: 'popup_modal' | 'on_page_section' | 'new_webpage'; setDeliveryMethod: (method: string) => void;
    macrogameId: string; setMacrogameId: (id: string) => void;
    skinId: string; setSkinId: (id: string) => void;
    skinConfig: SkinConfig; setSkinConfig: (config: SkinConfig) => void;
}

// Helper for General Settings section
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={styles.configSection}>
        <h4 style={{ ...styles.h4, marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
            {title}
        </h4>
        {children}
    </div>
);

export const DeliveryContainerEditorFormFields: React.FC<DeliveryContainerEditorFormFieldsProps> = ({
    containerId,
    onFormSave,
    macrogames,
    name, setName,
    deliveryMethod, setDeliveryMethod,
    macrogameId, setMacrogameId,
    skinId, setSkinId,
    skinConfig, setSkinConfig,
}) => {
    const { allMicrogames } = useData();

    const handleSave = () => {
        if (!containerId) return;
        if (!macrogameId) {
            notifications.error('Please select a macrogame for the container.');
            return;
        }
        const selectedMacrogame = macrogames.find(mg => mg.id === macrogameId);
        onFormSave(containerId, { 
            macrogameId, 
            macrogameName: selectedMacrogame?.name || '',
        });
    };

    const selectedMacrogame = macrogames.find(m => m.id === macrogameId);
    const isCurrentSelectionInvalid = selectedMacrogame
        ? hasMacrogameIssues(selectedMacrogame, allMicrogames)
        : !selectedMacrogame && !!containerId;

    const macrogameSelectStyle = isCurrentSelectionInvalid
        ? { ...styles.input, ...styles.inputAlert }
        : styles.input;

    return (
        <>
            <div>
                {/* --- 1. GENERAL SETTINGS (Common to all types) --- */}
                <FormSection title="General Settings">
                    <div style={styles.configItem}>
                        <label>Container Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} style={styles.input} />
                    </div>

                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                        <label>Container Type</label>
                        <select value={deliveryMethod} style={{ ...styles.input, backgroundColor: '#f0f2f5' }} disabled>
                            <option value="popup_modal">Popup Modal</option>
                            <option value="on_page_section">On-Page Section (Coming Soon)</option>
                            <option value="new_webpage">New Webpage (Coming Soon)</option>
                        </select>
                    </div>

                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                        <label>Macrogame</label>
                        <select value={macrogameId} onChange={e => setMacrogameId(e.target.value)} style={macrogameSelectStyle}>
                            <option value="">Select a macrogame...</option>
                            {macrogames.map(game => {
                                const hasIssues = hasMacrogameIssues(game, allMicrogames);
                                const isDisabled = hasIssues && game.id !== macrogameId;
                                return (<option key={game.id} value={game.id} disabled={isDisabled} style={{ color: hasIssues ? '#999' : 'inherit' }}>{hasIssues ? '⚠️ ' : ''}{game.name}</option>);
                            })}
                        </select>
                    </div>
                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                        <label>UI Skin</label>
                        <select value={skinId} onChange={e => { setSkinId(e.target.value); setSkinConfig(prev => ({ ...prev, header: { ...prev.header, title: '' } })) }} style={styles.input}>
                            <option value="">Select a UI Skin...</option>
                            {UI_SKINS.filter(s => s.id !== 'barebones').map(skin => <option key={skin.id} value={skin.id}>{skin.name}</option>)}
                        </select>
                    </div>
                </FormSection>

                {/* --- 2. TYPE-SPECIFIC SKIN FORM --- */}
                {/* If type is 'popup_modal' and skin is 'configurable-popup', show the skin form */}
                {deliveryMethod === 'popup_modal' && skinId === 'configurable-popup' && (
                    <PopupSkinForm 
                        skinConfig={skinConfig}
                        setSkinConfig={setSkinConfig}
                    />
                )}
                
                {/* Future: Add <SectionBuilder /> or <PageBuilder /> here */}
            </div>
            
            <button id="container-editor-save-button" type="button" onClick={handleSave} style={{ display: 'none' }} />
        </>
    );
};