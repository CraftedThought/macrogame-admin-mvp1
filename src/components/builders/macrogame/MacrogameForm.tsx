// src/components/builders/macrogame/MacrogameForm.tsx

import React, { useState, useEffect } from 'react';
import { Macrogame, Microgame, CurrentPage } from '../../../types';
import { MacrogameFormFields } from './MacrogameFormFields';
import { DEFAULT_MACROGAME_STATE } from '../../../constants/defaultMacrogameState';
import { hydrateMacrogame } from '../../../utils/helpers';

interface MacrogameFormProps {
    existingMacrogame?: Macrogame | null;
    onSave: (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
    onLaunchWizard: (data: object) => void;
    flowFromWizard: Microgame[] | null;
    onClearWizardFlow: () => void;
}

export const MacrogameForm: React.FC<MacrogameFormProps> = ({ existingMacrogame, onSave, onLaunchWizard, flowFromWizard, onClearWizardFlow }) => {
    // This state will hold the clean, fully hydrated data for the form.
    const [cleanData, setCleanData] = useState<Omit<Macrogame, 'id' | 'type'> & { id: string | null } | null>(null);

    useEffect(() => {
        // --- The "Prepare & Hydrate" step ---
        // We now rely on a strictly typed, deep-merge utility to guarantee the shape of the data
        const dataForForm = hydrateMacrogame(existingMacrogame, DEFAULT_MACROGAME_STATE);
        
        setCleanData(dataForForm);

    }, [existingMacrogame]);

    // --- This is the "Render" step ---
    // Only render the form component when we have clean data ready.
    // The `key` prop is crucial: it forces React to re-mount the component when we switch
    // between creating a new game and editing a different one, preventing state leakage.
    return cleanData ? (
        <MacrogameFormFields
            key={cleanData.id || 'new'}
            initialData={cleanData}
            onSave={onSave}
            onLaunchWizard={onLaunchWizard}
            flowFromWizard={flowFromWizard}
            onClearWizardFlow={onClearWizardFlow}
        />
    ) : null; // Render nothing while data is being prepared
};