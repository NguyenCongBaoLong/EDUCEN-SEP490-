import { createContext, useContext, useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'educen_scheduled_classes';
const CHANNEL_NAME = 'educen_schedule_channel';

/* ─── Initial schedule data ────────────────────────── */
const INITIAL_CLASSES = [
    { id: 1, code: 'TOÁN-101', name: 'Đại Số Nâng Cao', teacher: 'Thầy Minh', day: 1, startTime: '09:00', endTime: '11:00', color: '#3b82f6' },
    { id: 2, code: 'LÝ-202', name: 'Vật Lý Lượng Tử', teacher: null, day: 2, startTime: '09:00', endTime: '11:00', color: '#dc2626' },
    { id: 3, code: 'HÓA-105', name: 'Hóa Hữu Cơ Thí Nghiệm', teacher: 'Cô Hương', day: 2, startTime: '10:00', endTime: '12:00', color: '#f59e0b' },
    { id: 4, code: 'VĂN-300', name: 'Văn Học Việt Nam', teacher: 'Cô Hà', day: 4, startTime: '09:00', endTime: '11:00', color: '#8b5cf6' },
    { id: 5, code: 'SINH-101', name: 'Sinh Học Cơ Bản', teacher: 'Thầy Nam', day: 3, startTime: '13:00', endTime: '15:00', color: '#10b981' },
    { id: 6, code: 'ANH-201', name: 'IELTS Writing', teacher: 'Cô Lan', day: 6, startTime: '09:00', endTime: '11:00', color: '#06b6d4' },
    { id: 7, code: 'TOÁN-205', name: 'Luyện Thi THPT QG', teacher: 'Thầy Đức', day: 0, startTime: '14:00', endTime: '16:00', color: '#ec4899' },
];

/* Read from localStorage, fall back to initial data */
const loadClasses = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return INITIAL_CLASSES;
};

const ScheduleContext = createContext(null);

export const ScheduleProvider = ({ children }) => {
    const [scheduledClasses, setScheduledClassesRaw] = useState(loadClasses);
    const channelRef = useRef(null);

    /* Open BroadcastChannel once */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return; // SSR safety
        const ch = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = ch;

        /* Listen for updates from OTHER tabs */
        ch.onmessage = (e) => {
            if (e.data?.type === 'SCHEDULE_UPDATE') {
                setScheduledClassesRaw(e.data.classes);
            }
        };

        return () => ch.close();
    }, []);

    /* Wrapper: persist to localStorage AND broadcast to other tabs */
    const setScheduledClasses = (updater) => {
        setScheduledClassesRaw(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            // Persist
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) { /* ignore */ }
            // Broadcast to other tabs
            channelRef.current?.postMessage({ type: 'SCHEDULE_UPDATE', classes: next });
            return next;
        });
    };

    return (
        <ScheduleContext.Provider value={{ scheduledClasses, setScheduledClasses }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => {
    const ctx = useContext(ScheduleContext);
    if (!ctx) throw new Error('useSchedule must be used inside <ScheduleProvider>');
    return ctx;
};
