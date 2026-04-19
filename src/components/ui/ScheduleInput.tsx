import React from 'react';
import { styles } from '../../App.styles';
import { PopupSchedule } from '../../types';
import { DAYS_OF_WEEK } from '../../constants';

interface ScheduleInputProps {
    schedule: PopupSchedule,
    onChange: (newSchedule: PopupSchedule) => void
}

export const ScheduleInput: React.FC<ScheduleInputProps> = ({ schedule, onChange }) => {
    const handleDayChange = (day: string) => {
        onChange({ ...schedule, days: { ...schedule.days, [day]: !schedule.days[day] } });
    };
    return (
        <div style={styles.scheduleContainer}>
            <div style={styles.scheduleDays}>{DAYS_OF_WEEK.map(day => (<button key={day} type="button" onClick={() => handleDayChange(day)} style={schedule.days[day] ? {...styles.dayButton, ...styles.dayButtonActive} : styles.dayButton}>{day.charAt(0).toUpperCase()}</button>))}</div>
            <div style={styles.scheduleTimes}>
                <input type="time" value={schedule.startTime} onChange={e => onChange({...schedule, startTime: e.target.value})} style={styles.input} />
                <span>to</span>
                <input type="time" value={schedule.endTime} onChange={e => onChange({...schedule, endTime: e.target.value})} style={styles.input} />
                <select value={schedule.timezone} onChange={e => onChange({...schedule, timezone: e.target.value})} style={styles.input}><option value="America/New_York">EST</option><option value="America/Chicago">CST</option><option value="America/Denver">MST</option><option value="America/Los_Angeles">PST</option></select>
            </div>
        </div>
    );
};