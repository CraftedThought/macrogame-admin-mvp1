import React from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { styles } from '../../../App.styles';
import { Microgame, CustomMicrogame } from '../../../types';
import { useData } from '../../../hooks/useData';
import { StaticMicrogamePreview } from '../../previews/StaticMicrogamePreview';
import { useMicrogameBuilder } from '../../../hooks/useMicrogameBuilder';
import { notifications } from '../../../utils/notifications';

// --- Section Components ---
// These are now in the ./sections folder relative to this file
import { StrategySelector } from './sections/StrategySelector';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { VisualsSection } from './sections/VisualsSection';
import { AudioSection } from './sections/AudioSection';
import { RulesSection } from './sections/RulesSection';

interface MicrogameBuilderProps {
    baseGame: Microgame;
    initialVariant?: CustomMicrogame | null;
    onSave: () => void; 
    onCancel: () => void;
}

interface BuilderFormValues {
    name: string;
    description?: string;
    sectors?: string[];
    categories?: string[];
    subcategories?: string[];
    seasonality?: string[];
    targetAudience?: string[];
    promotionCompatibility?: string[];
}

export const MicrogameBuilder: React.FC<MicrogameBuilderProps> = ({ baseGame, initialVariant, onSave, onCancel }) => {
    const { isGuidedMode } = useData();

    // 1. Initialize Logic Hook
    const builder = useMicrogameBuilder(baseGame, initialVariant, onSave);

    // 2. Initialize Form (Basic Info)
    const methods = useForm<BuilderFormValues>({
        defaultValues: {
            name: initialVariant?.name || `${baseGame.name} - Custom`,
            description: initialVariant?.description || '',
            sectors: initialVariant?.sectors || [],
            categories: initialVariant?.categories || [],
            subcategories: initialVariant?.subcategories || [],
            seasonality: initialVariant?.seasonality || [],
            targetAudience: initialVariant?.targetAudience || [], 
            promotionCompatibility: initialVariant?.promotionCompatibility || []
        }
    });

    // 3. Bridge Form Submit to Hook Save
    const onSubmit: SubmitHandler<BuilderFormValues> = (data) => {
        const errors: string[] = [];
        if (!data.sectors || data.sectors.length === 0) errors.push("Please select at least one Business Sector (or 'All').");
        if (!data.categories || data.categories.length === 0) errors.push("Please select at least one Product Category (or 'All').");
        if (!data.subcategories || data.subcategories.length === 0) errors.push("Please select at least one Subcategory (or 'All').");
        if (!data.seasonality || data.seasonality.length === 0) errors.push("Please select at least one Seasonality option (or 'All').");
        if (!data.targetAudience || data.targetAudience.length === 0) errors.push("Please select at least one Target Audience option (or 'All').");
        if (!data.promotionCompatibility || data.promotionCompatibility.length === 0) errors.push("Please select at least one Promo Compatibility option (or 'All').");

        if (errors.length > 0) {
            errors.forEach(err => notifications.error(err));
            return;
        }

        builder.handleSave(data);
    };

    return (
        <div style={{ display: 'flex', height: '650px', gap: '2rem', overflow: 'hidden' }}>
            
            {/* LEFT: SETTINGS SCROLL AREA */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: '1rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <button 
                        type="button" 
                        onClick={onCancel}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: 0,
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#333'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                    >
                        <span>←</span> Back
                    </button>
                    <h2 style={{...styles.h2, marginBottom: '0.5rem'}}>Customize {baseGame.name}</h2>
                </div>

                {/* Wrap everything in FormProvider for BasicInfoSection */}
                <FormProvider {...methods}>
                    {/* ADDED noValidate to prevent browser interference with sliders */}
                    <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
                        
                        {/* A. STRATEGY MODE */}
                        <StrategySelector 
                            isGuidedMode={isGuidedMode}
                            configMode={builder.configMode}
                            setConfigMode={builder.setConfigMode}
                            baseGame={baseGame}
                            activeStrategy={builder.activeStrategy}
                            applyPreset={builder.applyPreset}
                        />

                        {/* B. BASIC INFO */}
                        <BasicInfoSection 
                            baseGame={baseGame}
                            isGuidedMode={isGuidedMode}
                        />

                        {/* C. VISUAL ASSETS */}
                        <VisualsSection 
                            baseGame={baseGame}
                            builder={builder} // Pass the whole object!
                            initialVariant={initialVariant}
                        />

                        {/* D. AUDIO ASSETS */}
                        <AudioSection 
                            skinnableElements={builder.skinnableElements}
                            skinPreviews={builder.skinPreviews}
                            skinFiles={builder.skinFiles}
                            audioVolumes={builder.audioVolumes}
                            playingAudioId={builder.playingAudioId}
                            audioTriggers={builder.audioTriggers}
                            initialVariant={initialVariant}
                            expandedEvents={builder.expandedEvents}
                            // Handlers
                            handleToggleAudio={builder.handleToggleAudio}
                            handleFileChange={builder.handleFileChange}
                            handleRemoveFile={builder.handleRemoveFile}
                            handleVolumeChange={builder.handleVolumeChange}
                            setSkinPreviews={builder.setSkinPreviews}
                            setSkinFiles={builder.setSkinFiles}
                            setAudioTriggers={builder.setAudioTriggers}
                            setAudioVolumes={builder.setAudioVolumes}
                            // Pass Layering Props
                            audioLayers={builder.audioLayers}
                            handleAddAudioLayer={builder.handleAddAudioLayer}
                            handleRemoveAudioLayer={builder.handleRemoveAudioLayer}
                            // Pass slider handlers for volume smoothing
                            handleSliderStart={builder.handleSliderStart}
                            handleSliderEnd={builder.handleSliderEnd}
                        />

                        {/* E. GAME RULES */}
                        <RulesSection 
                            baseGame={baseGame}
                            isGuidedMode={isGuidedMode}
                            builder={builder}
                            // Pass the actual setter here too, just in case RulesSection needs it
                            setPreviewKey={builder.setPreviewKey}
                        />

                        {/* F. ACTIONS */}
                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
                            <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancel</button>
                            <button type="submit" style={styles.saveButton}>
                                Save Variant
                            </button>
                        </div>

                    </form>
                </FormProvider>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div style={{ flex: 1, minWidth: 0, backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                <StaticMicrogamePreview 
                    refreshTrigger={builder.previewKey}
                    baseGame={baseGame}
                    variant={builder.previewVariant}
                    forceHideOverlay={builder.isInteracting}
                    debugShowHitboxId={builder.activeHitboxId}
                    activeMechanicId={builder.activeHitboxId}
                    // 2. Pause if interacting (Freeze Frame) OR if previewing specific audio (No overlap)
                    isPlaying={!builder.isInteracting && !builder.playingAudioId}
                    // When game starts (user interaction), stop audio preview
                    onGameStart={() => builder.handleToggleAudio('', '')} 
                />
            </div>
        </div>
    );
};