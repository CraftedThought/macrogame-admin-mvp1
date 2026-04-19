/* src/components/modals/CampaignFormFields.tsx */

import React, { useState, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { notifications } from '../../utils/notifications';
import { useForm, useFieldArray, SubmitHandler, FormProvider } from 'react-hook-form';
import { styles } from '../../App.styles';
// --- REFACTOR: Import DeliveryContainer ---
import { Campaign, DisplayRule, Macrogame, DeliveryContainer } from '../../types';
import { generateUUID } from '../../utils/helpers';
import { DisplayRuleForm } from '../forms/DisplayRuleForm';
import { CONVERSION_GOALS } from '../../constants';
import { useData } from '../../hooks/useData';

// --- Reusable Accordion Card for Macrogame Selection ---
// --- REFACTOR: Rename props from 'popup' to 'container' ---
const MacrogameSelectionCard: React.FC<{
    macrogame: Macrogame;
    availableContainers: DeliveryContainer[];
    selectedContainerIds: Set<string>;
    onToggleSelect: (containerId: string) => void;
}> = ({ macrogame, availableContainers, selectedContainerIds, onToggleSelect }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const deliveryMethodCount = availableContainers.length;

    return (
        <div style={{ ...styles.listItem, flexDirection: 'column', alignItems: 'stretch', marginBottom: '0.5rem' }}>
            <div onClick={() => setIsExpanded(!isExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <strong>{macrogame.name} ({deliveryMethodCount} {deliveryMethodCount === 1 ? 'Deliverable' : 'Deliverables'})</strong>
                <button type="button" style={styles.accordionButton}>{isExpanded ? '▲' : '▼'}</button>
            </div>
            {isExpanded && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* --- REFACTOR: Map over 'containers' --- */}
                    {availableContainers.map(container => (
                         <div key={container.id} style={styles.rewardItem}>
                             <input
                                 type="checkbox"
                                 id={`select-container-${container.id}`}
                                 checked={selectedContainerIds.has(container.id)}
                                 onChange={() => onToggleSelect(container.id)}
                             />
                             <label htmlFor={`select-container-${container.id}`} style={{ flex: 1, cursor: 'pointer' }}>{container.name}</label>
                             {/* --- REFACTOR: Display the specific deliveryMethod name --- */}
                             <span style={styles.tag}>{container.deliveryMethod === 'popup_modal' ? 'Popup Modal' : container.deliveryMethod}</span>
                         </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Main Form Component ---
interface CampaignFormFieldsProps {
    initialData: Partial<Campaign>;
    onSave: (data: Partial<Campaign>, campaignId: string | null) => Promise<void>;
    onClose: () => void;
    // --- REFACTOR: Add step/setStep from parent ---
    step: number;
    setStep: (step: number) => void;
}

type CampaignFormInputs = Omit<Campaign, 'id' | 'createdAt' | 'status' | 'containerIdList'>;

// --- Accept pre-weighted containers ---
const createNewRule = (weightedContainers: { containerId: string, weight: number }[]): DisplayRule => ({
    id: generateUUID(),
    name: 'New Rule',
    trigger: 'exit_intent',
    audience: 'all_visitors',
    schedule: {
        days: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'America/New_York',
    },
    containers: weightedContainers,
});

// Helper to compare two sets for equality
const setsAreEqual = (setA: Set<string>, setB: Set<string>) => {
    if (setA.size !== setB.size) return false;
    for (const item of setA) {
        if (!setB.has(item)) return false;
    }
    return true;
};


export const CampaignFormFields = forwardRef<any, CampaignFormFieldsProps>(({ initialData, onSave, onClose, step, setStep }, ref) => {
    // --- Use deliveryContainers ---
    const { macrogames, deliveryContainers } = useData();
    const todayString = new Date().toISOString().split('T')[0];
    const initialContainerIds = useMemo(() => 
        new Set(initialData.displayRules?.flatMap(rule => rule.containers.map(c => c.containerId)) || [])
    , [initialData.displayRules]);
    // --- Rename state ---
    const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(
        // --- Read from 'containers' array ---
        new Set(initialData.displayRules?.flatMap(rule => rule.containers.map(c => c.containerId)) || [])
    );
    
    const methods = useForm<CampaignFormInputs>({
        defaultValues: {
            name: initialData.name || '',
            goal: initialData.goal || '',
            displayRules: initialData.displayRules || []
        }
    });

    const watchedStartDate = methods.watch("startDate");

    useEffect(() => {
        if (initialData) {
            // 1. Reset all fields managed by react-hook-form
            methods.reset({
                name: initialData.name || '',
                goal: initialData.goal || '',
                displayRules: initialData.displayRules || [],
                startDate: initialData.startDate || null,
                endDate: initialData.endDate || null,
            });

            // 2. Reset the local state that tracks the selected container checkboxes
            // --- REFACTOR: Rename state and update logic ---
            const initialContainerIds = new Set(initialData.displayRules?.flatMap(rule => rule.containers.map(c => c.containerId)) || []);
            setSelectedContainerIds(initialContainerIds);
        }
    }, [initialData, methods.reset]);
    
    const { fields, append, remove, replace } = useFieldArray({
        control: methods.control,
        name: "displayRules",
        keyName: "key"
    });

    const campaignGoal = methods.watch('goal');

    const handleSave: SubmitHandler<CampaignFormInputs> = async (data) => {
        const campaignId = initialData.id || null;
        if (data.displayRules.length === 0) {
            notifications.error('A campaign must have at least one display rule.');
            return;
        }

        // --- Weight Validation Logic ---
        let hasInvalidWeight = false;
        for (const [index, rule] of data.displayRules.entries()) {
            // Sum all container weights in this rule
            const totalWeight = rule.containers.reduce((sum, container) => sum + (container.weight || 0), 0);
            
            // Check if the total is not exactly 100
            if (totalWeight !== 100) {
                notifications.error(`Rule ${index + 1} ("${rule.name}") has a total weight of ${totalWeight}%. It must be exactly 100%.`);
                hasInvalidWeight = true;
            }
        }

        if (hasInvalidWeight) {
            setStep(2); // Ensure user is on the rules step to see the error
            return; // Stop the save
        }
        // --- END: Weight Validation Logic ---


        // --- Denormalize containerIdList for Algolia ---
        const allContainerIds = new Set(data.displayRules.flatMap(rule => rule.containers.map(c => c.containerId)));
        let saveData: Partial<Campaign> = {
            ...data,
            containerIdList: Array.from(allContainerIds),
        };

        if (!campaignId) {
            saveData.status = 'Draft';
            saveData.createdAt = new Date().toISOString();
        }
        await onSave(saveData, campaignId);
    };

    const handleNextStep = () => {
        // 1. Check for empty selection
        if (selectedContainerIds.size === 0) {
            notifications.error("Please select at least one delivery method to include in this campaign.");
            return;
        }

        // 2. Check if the container selection has *actually changed*
        const selectionHasChanged = !setsAreEqual(selectedContainerIds, initialContainerIds);
        const currentRules = methods.getValues('displayRules');
        
        // 3. Only re-balance weights if it's a NEW campaign OR the selection changed
        if (currentRules.length === 0 || selectionHasChanged) {
            // Calculate Weights (Split 100 evenly)
            const selectedIdsArray = Array.from(selectedContainerIds);
            const count = selectedIdsArray.length;
            const baseWeight = Math.floor(100 / count);
            const remainder = 100 % count;

            const balancedContainers = selectedIdsArray.map((id, index) => ({
                containerId: id,
                weight: index < remainder ? baseWeight + 1 : baseWeight
            }));

            if (currentRules.length === 0) {
                // Create first rule with balanced containers
                replace([createNewRule(balancedContainers)]);
            } else {
                // Update ALL existing rules with the new balanced containers
                const updatedRules = currentRules.map(rule => ({
                    ...rule,
                    containers: balancedContainers
                }));
                replace(updatedRules);
            }
        }
        // 4. ELSE: If selection has NOT changed, do nothing.
        // This preserves the user's 60/40 weights.

        setStep(2);
    };

    const recommendedMacrogames = useMemo(() => {
        if (!campaignGoal) return [];
        return macrogames.filter(mg => mg.conversionGoal === campaignGoal);
    // --- REFACTOR: Update dependency ---
    }, [campaignGoal, macrogames]);

    useImperativeHandle(ref, () => ({
        handleNextStep
    }));

    // --- REFACTOR: Rename function and parameter ---
    const handleToggleSelect = (containerId: string) => {
        setSelectedContainerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(containerId)) {
                newSet.delete(containerId);
            } else {
                newSet.add(containerId);
            }
            return newSet;
        });
    };

    const saveButtonText = initialData.id ? 'Save Changes' : 'Create Campaign';
    
    return (
        <FormProvider {...methods}>
            <form id="campaign-form" onSubmit={methods.handleSubmit(handleSave)}>
                {/* --- STEP 1: Selection --- */}
                {step === 1 && (
                    <div>
                         <div style={styles.configItem}>
                            <label>Campaign Name</label>
                            <input type="text" placeholder="e.g., Summer Sale Campaign" {...methods.register("name", { required: true })} style={styles.input} />
                        </div>
                        <div style={{...styles.configItem, marginTop: '1rem'}}>
                            <label>Campaign Goal</label>
                            <select {...methods.register("goal", { required: true })} style={styles.input}>
                                <option value="" disabled>Choose a goal to see recommendations...</option>
                                {Object.entries(CONVERSION_GOALS).map(([groupLabel, options]) => ( <optgroup label={groupLabel} key={groupLabel}> {options.map(option => <option key={option} value={option}>{option}</option>)} </optgroup> ))}
                            </select>
                        </div>
                        <div style={{...styles.configRow, marginTop: '1rem'}}>
                            <div style={styles.configItem}>
                                <label>Start Date (Optional)</label>
                                {/* Only block past dates for NEW campaigns */}
                                <input type="date" {...methods.register("startDate")} style={styles.input} min={!initialData.id ? todayString : undefined} />
                            </div>
                            <div style={styles.configItem}>
                                <label>End Date (Optional)</label>
                                {/* The 'min' for the end date should be the later of today or the selected start date */}
                                <input type="date" {...methods.register("endDate")} style={styles.input} min={watchedStartDate > todayString ? watchedStartDate : todayString} />
                            </div>
                        </div>

                        {campaignGoal && (
                            <div style={{marginTop: '2rem'}}>
                                <h4 style={styles.h4}>Recommended Macrogames</h4>
                                <p style={styles.descriptionText}>Select one or more Macrogame iterations to include in this campaign.</p>
                                <div style={{maxHeight: '40vh', overflowY: 'auto'}}>
                                    {recommendedMacrogames.map(mg => {
                                        // --- REFACTOR: Find available containers (Popups only AND Configured) ---
                                        const availableContainers = deliveryContainers.filter(c => 
                                            c.macrogameId === mg.id && 
                                            c.deliveryMethod === 'popup_modal' &&
                                            // Only show containers that are OK or have a Warning (not Error)
                                            (c.status?.code === 'ok' || c.status?.code === 'warning')
                                        );
                                        
                                        if (availableContainers.length === 0) return null;
                                        
                                        return <MacrogameSelectionCard 
                                            key={mg.id} 
                                            macrogame={mg} 
                                            availableContainers={availableContainers} 
                                            selectedContainerIds={selectedContainerIds} 
                                            onToggleSelect={handleToggleSelect} 
                                        />
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- STEP 2: Configuration --- */}
                {step === 2 && (
                    <div>
                        <div style={{ ...styles.managerHeader, marginTop: '1rem' }}>
                            <h3 style={{...styles.h3, margin: 0, border: 'none'}}>Display Rules</h3>
                            {/* --- REFACTOR: Pass empty array to createNewRule --- */}
                            <button type="button" onClick={() => {
                                // Calculate weights again for the new rule
                                const selectedIdsArray = Array.from(selectedContainerIds);
                                const count = selectedIdsArray.length;
                                const baseWeight = Math.floor(100 / count);
                                const remainder = 100 % count;
                                const balancedContainers = selectedIdsArray.map((id, index) => ({
                                    containerId: id,
                                    weight: index < remainder ? baseWeight + 1 : baseWeight
                                }));

                                append(createNewRule(balancedContainers));
                            }} style={styles.saveButton}>Add Another Rule</button>
                        </div>
                         {fields.map((field, index) => (
                            <DisplayRuleForm
                                key={field.key}
                                index={index}
                                onRemove={remove}
                                // --- REFACTOR: Pass selectedContainers to child form ---
                                selectedContainers={deliveryContainers.filter(c => selectedContainerIds.has(c.id))}
                            />
                        ))}
                    </div>
                )}
            </form>
        </FormProvider>
    );
});
