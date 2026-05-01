/* src/components/modals/MacrogameEditModal.tsx */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Macrogame, Microgame } from '../../types';
import { useData } from '../../hooks/useData';
import { notifications } from '../../utils/notifications';
import { styles } from '../../App.styles';
import { Modal } from '../ui/Modal';
import { MacrogameForm } from '../builders/macrogame/MacrogameForm';

interface MacrogameEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    macrogame: Macrogame | null;
    onLaunchWizard: (data: object) => void;
    flowFromWizard: Microgame[] | null;
    onClearWizardFlow: () => void;
}

export const MacrogameEditModal: React.FC<MacrogameEditModalProps> = ({
    isOpen,
    onClose,
    macrogame,
    onLaunchWizard,
    flowFromWizard,
    onClearWizardFlow
}) => {
    const navigate = useNavigate();
    const { macrogames, updateMacrogame } = useData();
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdateAndCloseMacrogame = async (updatedData: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        const newName = updatedData.name?.trim();
        if (!newName) {
            notifications.error("Macrogame name cannot be empty.");
            return;
        }

        const isNameTaken = macrogames.some(m => m.name === newName && m.id !== updatedData.id);
        if (isNameTaken) {
            notifications.error(`A macrogame named "${newName}" already exists. Please choose a unique name.`);
            return;
        }

        setIsSaving(true);
        try {
            await updateMacrogame(updatedData);

            notifications.success('Macrogame saved');
            onClose();

            // Send a signal to the MacrogamesManager to refresh its list
            navigate('/manager', { state: { refreshTimestamp: Date.now() } });

        } catch (error) {
            notifications.error('Failed to save macrogame.');
            console.error("Error saving macrogame:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Note: We use a hidden button click to trigger the form's internal save routine 
    // from this external modal footer, maintaining separation of concerns.
    const triggerFormSave = () => {
        document.getElementById('macrogame-form-save-button')?.click();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Macrogame"
            size="large"
            footer={(
                <>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        style={styles.secondaryButton}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={triggerFormSave} 
                        style={{ ...styles.saveButton, opacity: isSaving ? 0.7 : 1 }}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </>
            )}
        >
            <MacrogameForm
                existingMacrogame={macrogame}
                onSave={handleUpdateAndCloseMacrogame}
                onLaunchWizard={onLaunchWizard}
                flowFromWizard={flowFromWizard}
                onClearWizardFlow={onClearWizardFlow}
            />
        </Modal>
    );
};