import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ScheduleContext = createContext(null);

export const ScheduleProvider = ({ children }) => {
    const [scheduledClasses, setScheduledClasses] = useState([]);
    const [loading, setLoading] = useState(false);

    const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            const parts = dateStr.substring(0, 10).split('-');
            if (parts.length !== 3) return null;
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return isNaN(d.getTime()) ? null : d;
        } catch (e) {
            return null;
        }
    };

    const refreshSchedules = useCallback(async () => {
        // Do not fetch schedule data on sysadmin pages
        if (window.location.pathname.startsWith('/sysadmin')) return;

        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role === 'SystemAdmin') return;
            } catch (e) {}
        }

        setLoading(true);
        try {
            const currentUserStr = localStorage.getItem('user');
            let endpoint = '/Schedules';
            let sessionEndpoint = null;
            let mergeBaseAndSessions = false;

            if (currentUserStr) {
                try {
                    const user = JSON.parse(currentUserStr);
                    if (user.role === 'Teacher') {
                        endpoint = '/Schedules/teacher/me';
                        sessionEndpoint = '/Schedules/teacher/me/sessions';
                        mergeBaseAndSessions = true;
                    } else if (user.role === 'Admin' || user.role === 'TenantAdmin') {
                        endpoint = '/Schedules';
                        sessionEndpoint = '/Schedules/sessions';
                        mergeBaseAndSessions = true;
                    } else if (user.role === 'Assistant') {
                        endpoint = '/Schedules/assistant/me';
                    } else if (user.role === 'Student') {
                        endpoint = '/Schedules/student/me';
                    }
                } catch (e) {
                    console.error('Error parsing user for schedule fetch:', e);
                }
            }

            const mapSchedule = (s, source = 'schedule') => {
                const colors = ['#3b82f6', '#dc2626', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4', '#ec4899'];
                const color = colors[s.classId % colors.length];

                return {
                    id: s.scheduleId,
                    eventKey: source === 'session' && s.sessionId ? `session-${s.sessionId}` : `schedule-${s.scheduleId}`,
                    source,
                    sessionId: s.sessionId || null,
                    sessionDate: parseLocalDate(s.sessionDate),
                    sessionStatus: s.sessionStatus || null,
                    classId: s.classId,
                    code: s.className ? s.className.substring(0, 4).toUpperCase() : `LOP-${s.classId}`,
                    name: s.className || `Lớp học ${s.classId}`,
                    teacher: s.teacherName || 'Giáo viên',
                    subjectId: s.subjectId,
                    subjectName: s.subjectName,
                    day: s.dayOfWeek,
                    startDate: parseLocalDate(s.startDate),
                    endDate: parseLocalDate(s.endDate),
                    startTime: s.startTime.substring(0, 5),
                    endTime: s.endTime.substring(0, 5),
                    roomName: s.roomName,
                    color,
                    status: s.status
                };
            };

            if (mergeBaseAndSessions && sessionEndpoint) {
                const [baseRes, sessionRes] = await Promise.all([
                    api.get(endpoint),
                    api.get(sessionEndpoint)
                ]);

                const baseSchedules = (baseRes.data || []).map(s => mapSchedule(s, 'schedule'));
                const sessionSchedules = (sessionRes.data || []).map(s => mapSchedule(s, 'session'));
                setScheduledClasses([...baseSchedules, ...sessionSchedules]);
            } else {
                const res = await api.get(endpoint);
                const mapped = (res.data || []).map(s => mapSchedule(s, 'schedule'));
                setScheduledClasses(mapped);
            }
        } catch (error) {
            console.error('Lỗi khi tải lịch học:', error);
        } finally {
            setLoading(false);
        }
    }, []);

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
