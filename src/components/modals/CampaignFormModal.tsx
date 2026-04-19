// src/components/modals/CampaignFormModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Campaign } from '../../types';
import { Modal } from '../ui/Modal';
import { CampaignFormFields } from './CampaignFormFields';
import { styles } from '../../App.styles';

interface CampaignFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Campaign>, campaignId: string | null) => Promise<void>;
    existingCampaign?: Campaign | null;
}

// Define a complete, "clean" default state for a new campaign
const createDefaultCampaign = (): Partial<Campaign> => ({
    name: '',
    goal: '',
    displayRules: [],
    status: 'Draft',
    createdAt: new Date().toISOString(),
    startDate: null,
    endDate: null,
});

export const CampaignFormModal: React.FC<CampaignFormModalProps> = ({ isOpen, onClose, onSave, existingCampaign }) => {
    // This state will hold the clean, complete data for the form.
    const [cleanData, setCleanData] = useState<Partial<Campaign> | null>(null);

    const [step, setStep] = useState(1);
    const formFieldsRef = useRef<{ handleNextStep: () => void }>(null);

    useEffect(() => {
        if (isOpen) {
            setStep(1); // Always reset to the first step when the modal opens
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            // --- This is the "Prepare" step ---
            let dataForForm: Partial<Campaign>;

            if (existingCampaign) {
                // If editing, merge existing data with defaults
                dataForForm = {
                    ...createDefaultCampaign(),
                    ...existingCampaign
                };
            } else {
                // If creating, use a fresh set of defaults
                dataForForm = createDefaultCampaign();
            }
            setCleanData(dataForForm);
        } else {
            // When modal closes, clear the data to ensure it's fresh next time
            setCleanData(null);
        }
    }, [isOpen, existingCampaign]);
    
    const modalTitle = existingCampaign ? 'Edit Campaign' : 'Create New Campaign';

    const modalFooter = (
        <>
            {step === 1 && (
                <>
                    <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                    <button type="button" onClick={() => formFieldsRef.current?.handleNextStep()} style={styles.saveButton}>Next</button>
                </>
            )}
            {step === 2 && (
                <>
                    <button type="button" onClick={() => setStep(1)} style={styles.secondaryButton}>Back</button>
                    <button type="submit" form="campaign-form" style={styles.saveButton}>{existingCampaign ? 'Save Changes' : 'Create Campaign'}</button>
                </>
            )}
        </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={modalTitle}
            size="large"
            footer={modalFooter}
        >
            {/* --- This is the "Render" step --- */}
            {/* Conditionally render the form only when cleanData is ready */}
            {cleanData && (
                <CampaignFormFields
                    ref={formFieldsRef}
                    key={cleanData.id || 'new'}
                    initialData={cleanData}
                    onSave={onSave}
                    onClose={onClose}
                    step={step}
                    setStep={setStep}
                />
            )}
        </Modal>
    );
};