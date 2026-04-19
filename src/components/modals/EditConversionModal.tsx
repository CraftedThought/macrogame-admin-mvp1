/* src/components/modals/EditConversionModal.tsx */

import React from 'react';
import { styles } from '../../App.styles';
import { ConversionMethod } from '../../types';
import { Modal } from '../ui/Modal';
import { ConversionMethodBuilder } from '../builders/ConversionMethodBuilder';

interface EditConversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversion: ConversionMethod | null;
    onSaveSuccess: () => void; 
}

export const EditConversionModal: React.FC<EditConversionModalProps> = ({ isOpen, onClose, conversion, onSaveSuccess }) => {
    // Local state to hold the live name
    const [liveName, setLiveName] = React.useState(conversion?.name || '');

    // Reset when modal opens/conversion changes
    React.useEffect(() => {
        if (isOpen && conversion) {
            setLiveName(conversion.name);
        }
    }, [isOpen, conversion]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            // Use the liveName in the REAL Modal header
            title={`Edit Method: ${liveName || 'Untitled'}`} 
            size="large"
            footer={null} 
        >
            <div style={{ height: 'calc(90vh - 150px)', minHeight: '500px' }}>
                {conversion && (
                    <ConversionMethodBuilder 
                        initialMethod={conversion}
                        onSave={() => {
                            onSaveSuccess();
                            onClose();
                        }}
                        onCancel={onClose}
                        // Listen for changes from the form
                        onNameChange={setLiveName}
                    />
                )}
            </div>
        </Modal>
    );
};