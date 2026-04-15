import React from 'react';
import TeacherPerformanceReport from '../teacher/TeacherPerformanceReport';

const TAPerformanceReport = () => {
    // Truyền isTA={true} để Sidebar và logic nội bộ hiểu đây là giao diện trợ giảng
    return <TeacherPerformanceReport isTA={true} />;
};

export default TAPerformanceReport;