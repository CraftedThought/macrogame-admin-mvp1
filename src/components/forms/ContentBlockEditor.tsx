/* src/components/forms/ContentBlockEditor.tsx */

import React from 'react';
import { styles } from '../../App.styles';
import { SkinContentBlock } from '../../types';
import { SimpleTextEditor } from './SimpleTextEditor';

interface ContentBlockEditorProps {
    block: SkinContentBlock;
    updateBlock: (id: string, field: keyof Omit<SkinContentBlock, 'id' | 'position'>, value: string) => void;
    removeBlock: (id: string) => void;
    // --- NEW: Accept background color ---
    backgroundColor?: string;
}

export const ContentBlockEditor: React.FC<ContentBlockEditorProps> = ({ block, updateBlock, removeBlock, backgroundColor = '#ffffff' }) => {
    return (
        <div style={{ marginBottom: '1rem', border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555' }}>
                    {block.position === 'above' ? 'Block Above Game' : 'Block Below Game'}
                </span>
                <button 
                    type="button" 
                    onClick={() => removeBlock(block.id)}
                    style={styles.deleteButton}
                >
                    Remove
                </button>
            </div>
            
            {/* Pass background color to the editor */}
            <SimpleTextEditor 
                initialHtml={block.content}
                onChange={(html) => updateBlock(block.id, 'content', html)}
                backgroundColor={backgroundColor}
            />
        </div>
    );
};