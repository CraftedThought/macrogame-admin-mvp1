/* src/components/forms/SimpleTextEditor.tsx */

import React, { useMemo, useEffect, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// --- REGISTER INLINE STYLES ---
const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);

// Note: We removed the Font Size whitelist to rely on semantic Headers + Spacing controls.

const ColorStyle = Quill.import('attributors/style/color');
Quill.register(ColorStyle, true);

const BackgroundStyle = Quill.import('attributors/style/background');
Quill.register(BackgroundStyle, true);

// ------------------------------

interface SimpleTextEditorProps {
    initialHtml: string;
    onChange: (html: string) => void;
    placeholder?: string;
    backgroundColor?: string;
    defaultTextColor?: string;
}

export const SimpleTextEditor: React.FC<SimpleTextEditorProps> = ({ initialHtml, onChange, placeholder, backgroundColor = '#ffffff', defaultTextColor }) => {
    
    const quillRef = useRef<ReactQuill>(null);

    const colors = [
        "#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc", "#9933ff", "#ffffff", 
        "#facccc", "#ffebcc", "#ffffcc", "#cce8cc", "#cce0f5", "#ebd6ff", "#bbbbbb", "#f06666", 
        "#ffc266", "#ffff66", "#66b966", "#66a3e0", "#c285ff", "#888888", "#a10000", "#b26b00", 
        "#b2b200", "#006100", "#0047b2", "#6b24b2", "#444444", "#5c0000", "#663d00", "#666600", 
        "#003700", "#002966", "#3d1466"
    ];

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                // 1=H1, 2=H2, 3=H3, false=Normal, 4=Small
                [{ 'header': [1, 2, 3, false, 4] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': colors }, { 'background': colors }],
                [{ 'align': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'clean'],
                ['undo', 'redo']
            ],
            handlers: {
                'undo': function(this: any) { this.quill.history.undo(); },
                'redo': function(this: any) { this.quill.history.redo(); }
            }
        },
        history: { delay: 500, maxStack: 100, userOnly: true }
    }), []);

    const formats = [
        'header', 'font', 
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'indent',
        'link', 'align'
    ];

    // Tooltip Effect
    useEffect(() => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
            const toolbar = editor.getModule('toolbar');
            if (toolbar && toolbar.container) {
                const buttons = toolbar.container.querySelectorAll('button, span.ql-picker');
                buttons.forEach((btn: HTMLElement) => {
                    const className = btn.classList[0]; 
                    if (!className) return;
                    
                    let title = '';
                    switch (className) {
                        case 'ql-bold': title = 'Bold'; break;
                        case 'ql-italic': title = 'Italic'; break;
                        case 'ql-underline': title = 'Underline'; break;
                        case 'ql-strike': title = 'Strikethrough'; break;
                        case 'ql-link': title = 'Insert Link'; break;
                        case 'ql-clean': title = 'Clear Formatting'; break;
                        case 'ql-list': title = btn.value === 'ordered' ? 'Ordered List' : 'Bullet List'; break;
                        case 'ql-align': title = 'Text Alignment'; break;
                        case 'ql-header': title = 'Text Style'; break; // Renamed per request
                        case 'ql-color': title = 'Text Color'; break;
                        case 'ql-background': title = 'Highlight Color'; break;
                        case 'ql-undo': title = 'Undo'; break;
                        case 'ql-redo': title = 'Redo'; break;
                    }
                    if (title) btn.setAttribute('title', title);
                });
            }
        }
    }, []);

    const getContrastYIQ = (hexcolor: string) => {
        if (!hexcolor) return 'black';
        hexcolor = hexcolor.replace("#", "");
        const r = parseInt(hexcolor.substr(0,2),16);
        const g = parseInt(hexcolor.substr(2,2),16);
        const b = parseInt(hexcolor.substr(4,2),16);
        const yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    const effectiveTextColor = defaultTextColor || getContrastYIQ(backgroundColor);
    const iconColor = getContrastYIQ(backgroundColor) === 'white' ? '#ccc' : '#444';

    return (
        <div className="custom-quill-wrapper" style={{ backgroundColor: backgroundColor, borderRadius: '8px', overflow: 'visible', border: '1px solid #ccc' }}>
            <ReactQuill 
                ref={quillRef}
                theme="snow"
                value={initialHtml}
                onChange={onChange}
                placeholder={placeholder}
                modules={modules}
                formats={formats}
                style={{ height: 'auto', display: 'flex', flexDirection: 'column' }}
            />
            
            <style>{`
                .custom-quill-wrapper .ql-container {
                    font-family: inherit;
                    font-size: 20px; /* Base size for Normal text - scaled up for game screen visibility */
                    min-height: 150px;
                    border: none !important;
                }
                
                /* CRITICAL: Enforce tight spacing logic */
                .custom-quill-wrapper .ql-editor {
                    color: ${effectiveTextColor}; 
                    min-height: 150px;
                    line-height: 1.25; /* Body text line height */
                    padding: 24px; /* Increased padding to accommodate 'outside' bullets */
                }
                
                /* ZERO MARGINS & TIGHT HEADINGS */
                .custom-quill-wrapper .ql-editor p,
                .custom-quill-wrapper .ql-editor h1,
                .custom-quill-wrapper .ql-editor h2,
                .custom-quill-wrapper .ql-editor h3,
                .custom-quill-wrapper .ql-editor h4 {
                    margin: 0;
                    padding: 0;
                }

                /* FIX LIST OFFSETS: Mirror the Live Preview logic */
                /* Remove default left padding that shifts content right */
                .custom-quill-wrapper .ql-editor ul,
                .custom-quill-wrapper .ql-editor ol {
                    padding-left: 0 !important;
                    margin-left: 0 !important;
                    list-style-position: inside !important; /* Ensures bullet centers with text */
                }
                .custom-quill-wrapper .ql-editor li {
                    padding: 0 !important;
                    margin: 0 !important;
                }

                /* tighter line-height for headings to remove ghost padding */
                .custom-quill-wrapper .ql-editor h1,
                .custom-quill-wrapper .ql-editor h2,
                .custom-quill-wrapper .ql-editor h3,
                .custom-quill-wrapper .ql-editor h4 {
                    line-height: 1.1; 
                }

                /* Visual distinction for Headers in Editor */
                .custom-quill-wrapper .ql-editor h1 { font-size: 2em; font-weight: bold; }
                .custom-quill-wrapper .ql-editor h2 { font-size: 1.5em; font-weight: bold; }
                .custom-quill-wrapper .ql-editor h3 { font-size: 1.17em; font-weight: bold; }
                .custom-quill-wrapper .ql-editor h4 { font-size: 0.75em; font-weight: normal; } /* Small */

                .custom-quill-wrapper .ql-editor.ql-blank::before {
                    color: ${effectiveTextColor};
                    opacity: 0.6;
                    font-style: italic;
                }
                
                /* Toolbar Styling */
                .custom-quill-wrapper .ql-toolbar {
                    background-color: ${backgroundColor === '#ffffff' ? '#f8f9fa' : 'rgba(255,255,255,0.1)'};
                    border: none !important;
                    border-bottom: 1px solid ${backgroundColor === '#ffffff' ? '#ccc' : 'rgba(255,255,255,0.2)'} !important;
                    /* Add radius to top corners since wrapper overflow is visible */
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                }
                .custom-quill-wrapper .ql-stroke { stroke: ${iconColor} !important; }
                .custom-quill-wrapper .ql-fill { fill: ${iconColor} !important; }
                .custom-quill-wrapper .ql-picker { color: ${iconColor} !important; }
                
                /* Undo/Redo Text Color */
                .custom-quill-wrapper .ql-undo,
                .custom-quill-wrapper .ql-redo {
                    color: ${iconColor} !important;
                }
                
                /* Dropdown Options */
                .custom-quill-wrapper .ql-picker-options {
                    background-color: white !important;
                    color: black !important;
                    z-index: 1000 !important;
                    border: 1px solid #ccc;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .custom-quill-wrapper .ql-color .ql-picker-options,
                .custom-quill-wrapper .ql-background .ql-picker-options {
                    right: 0 !important;
                    left: auto !important;
                    width: 170px !important;
                }

                /* Header Dropdown Labels */
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-label::before, 
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-item::before {
                    content: 'Normal';
                }
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
                    content: 'Heading 1';
                }
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
                    content: 'Heading 2';
                }
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
                    content: 'Heading 3';
                }
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
                .custom-quill-wrapper .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before {
                    content: 'Small';
                }

                /* Undo/Redo Icons */
                .ql-undo:after { content: '↺'; }
                .ql-redo:after { content: '↻'; }
                
            `}</style>
        </div>
    );
};