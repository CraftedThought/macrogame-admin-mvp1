// src/components/ui/ConfirmationToast.tsx

import React from 'react';
import toast from 'react-hot-toast';

interface ConfirmationToastProps {
  t: { id: string }; // The toast object provided by react-hot-toast
  message: string;
  onConfirm: () => void;
}

export const ConfirmationToast: React.FC<ConfirmationToastProps> = ({ t, message, onConfirm }) => (
    <div style={{ background: '#333', color: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '450px', width: '100%', boxSizing: 'border-box', border: '1px solid #444' }}>
        <span style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{message}</span>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
            <button style={{ background: '#7f8c8d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => toast.remove(t.id)}>Cancel</button>
            <button style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { onConfirm(); toast.remove(t.id); }}>Confirm</button>
        </div>
    </div>
);