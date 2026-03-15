import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ScheduleContext = createContext(null);

export const ScheduleProvider = ({ children }) => {
    const [scheduledClasses, setScheduledClasses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Parse date string as local date (not UTC) to avoid timezone off-by-one issues
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        // "2025-03-10T00:00:00" or "2025-03-10" → parse as local
        const parts = dateStr.substring(0, 10).split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const refreshSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/Schedules');
            // Map backend ScheduleDto to frontend format
            const mapped = res.data.map(s => {
                const colors = ['#3b82f6', '#dc2626', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4', '#ec4899'];
                const color = colors[s.classId % colors.length];

                return {
                    id: s.scheduleId,
                    classId: s.classId,
                    code: s.className ? s.className.substring(0, 4).toUpperCase() : `LỚP-${s.classId}`,
                    name: s.className || `Lớp học ${s.classId}`,
                    teacher: s.teacherName || 'Giáo viên',
                    subjectId: s.subjectId,
                    subjectName: s.subjectName,
                    day: s.dayOfWeek,
                    startDate: parseLocalDate(s.startDate),
                    endDate: parseLocalDate(s.endDate),
                    startTime: s.startTime.substring(0, 5),
                    endTime: s.endTime.substring(0, 5),
                    color: color,
                    status: s.status
                };
            });
            setScheduledClasses(mapped);
        } catch (error) {
            console.error('Lỗi khi tải lịch học:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount (only if token exists)
    useEffect(() => {
        refreshSchedules();
    }, [refreshSchedules]);

    return (
        <ScheduleContext.Provider value={{
            scheduledClasses,
            setScheduledClasses,
            refreshSchedules,
            loading
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => {
    const ctx = useContext(ScheduleContext);
    if (!ctx) throw new Error('useSchedule must be used inside <ScheduleProvider>');
    return ctx;
};
