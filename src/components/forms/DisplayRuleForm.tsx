/* src/components/forms/DisplayRuleForm.tsx */

import React, { useState, useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { styles } from '../../App.styles';
import { useData } from '../../hooks/useData';
import { hasMacrogameIssues } from '../../utils/helpers';
import { ScheduleInput } from '../ui/ScheduleInput';
// --- Import DeliveryContainer instead of Popup ---
import { DeliveryContainer } from '../../types';

interface DisplayRuleFormProps {
  index: number;
  onRemove: (index: number) => void;
  // --- We now receive the pre-selected containers from the parent modal ---
  selectedContainers: DeliveryContainer[];
}

export const DisplayRuleForm: React.FC<DisplayRuleFormProps> = ({ index, onRemove, selectedContainers }) => {
  const { register, control, watch, setValue } = useFormContext();
  const { macrogames, allMicrogames } = useData();
  const [isExpanded, setIsExpanded] = useState(true);

  const ruleName = watch(`displayRules.${index}.name`, `Rule #${index + 1}`);
  // --- Watch the 'containers' array ---
  const containerWeights = watch(`displayRules.${index}.containers`, []);
  // --- Calculate total weight in real-time ---
  const totalWeight = useMemo(() => {
    // Loop through the array and sum all 'weight' properties
    return containerWeights.reduce((sum: number, container: any) => sum + (container.weight || 0), 0);
  }, [containerWeights]);

  const isWeightInvalid = totalWeight !== 100;

  // --- Rename function and parameters ---
  const handleContainerWeightChange = (containerId: string, weight: string) => {
      let finalWeight: number | '' = ''; // Allow empty string
      const numericWeight = parseInt(weight, 10);

      if (weight === '') {
          finalWeight = ''; // Store empty string
      } else if (!isNaN(numericWeight) && numericWeight >= 0) {
          finalWeight = numericWeight; // Store number
      } else {
          return; // Invalid input (e.g., "abc", "-5"), do nothing
      }

      const currentContainers = watch(`displayRules.${index}.containers`, []);
      const newContainers = currentContainers.map((c: any) => 
          c.containerId === containerId ? { ...c, weight: finalWeight } : c
      );
      setValue(`displayRules.${index}.containers`, newContainers, { shouldDirty: true });
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ ...styles.managerHeader, marginBottom: '1.5rem', cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
        <h4 style={{...styles.h4, margin: 0, flex: 1}}>{ruleName}</h4>
        <div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(index); }} style={{...styles.deleteButton, marginRight: '1rem'}}>Remove Rule</button>
          <button type="button" style={styles.accordionButton}>{isExpanded ? '▲' : '▼'}</button>
        </div>
      </div>
      {isExpanded && (
        <>
          <div style={styles.configItem}>
            <label>Rule Name</label>
            <input type="text" placeholder={`e.g., Weekday Mornings`} {...register(`displayRules.${index}.name` as const, { required: true })} style={styles.input} />
          </div>
          <div style={{...styles.configRow, marginTop: '1rem'}}>
            <div style={styles.configItem}><label>Trigger</label><select {...register(`displayRules.${index}.trigger` as const)} style={styles.input}><option value="exit_intent">Exit Intent</option><option value="timed">Timed Delay</option><option value="scroll">Scroll Percentage</option></select></div>
            <div style={styles.configItem}><label>Audience</label><select {...register(`displayRules.${index}.audience` as const)} style={styles.input}><option value="all_visitors">All Visitors</option><option value="new_visitors">New Visitors</option><option value="returning_visitors">Returning Visitors</option></select></div>
          </div>
          <div style={{marginTop: '1.5rem'}}>
            <label style={{fontWeight: 'bold'}}>Schedule</label>
            <Controller name={`displayRules.${index}.schedule` as const} control={control} render={({ field }) => <ScheduleInput schedule={field.value} onChange={field.onChange} />} />
          </div>
          <div style={{marginTop: '1.5rem'}}>
            <label style={{fontWeight: 'bold'}}>A/B Test & Weights</label>
            {/* --- Real-time validation message --- */}
            <div style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                marginTop: '0.75rem',
                backgroundColor: isWeightInvalid ? '#fbe9e7' : '#e8f5e9', // Light red / green
                color: isWeightInvalid ? '#d84315' : '#2e7d32'     // Dark red / green
            }}>
                Total Weight: {totalWeight}%
                {isWeightInvalid && <b> (Must be exactly 100%)</b>}
            </div>
            <p style={styles.descriptionText}>The following delivery methods will be rotated based on the weights you assign.</p>
             <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '6px', marginTop: '0.5rem'}}>
              {/* --- Map over selectedContainers --- */}
              {selectedContainers.map(container => {
                  const macrogame = macrogames.find(m => m.id === container.macrogameId);
                  // --- Check container.skinId ---
                  const hasIssues = !macrogame || hasMacrogameIssues(macrogame, allMicrogames) || !container.skinId;
                  // --- Find weight using containerId ---
                  const currentContainer = containerWeights.find((c: any) => c.containerId === container.id);
                  const currentContainerWeight = currentContainer?.weight;
                  
                  return (
                      // --- Use container.id as key ---
                      <div key={container.id} style={{...styles.rewardItem, backgroundColor: hasIssues ? '#f9f9f9' : 'white'}}>
                          <label style={{flex: 1, color: hasIssues ? '#999' : 'inherit'}}>
                              {/* --- Use container.name --- */}
                              {container.name} {hasIssues && <span style={{fontSize: '0.8rem', color: '#e74c3c'}}> (Incomplete)</span>}
                          </label>
                          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                              <label>Weight:</label>
                              {/* --- Use currentContainerWeight and handleContainerWeightChange --- */}
                              <input type="number" value={currentContainerWeight === 0 ? 0 : (currentContainerWeight || '')} onChange={(e) => handleContainerWeightChange(container.id, e.target.value)} style={{...styles.pointsInput, width: '70px'}} />
                          </div>
                      </div>
                  );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
