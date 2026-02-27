import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Pricing from './pages/Pricing';
import CenterHome from './pages/center/CenterHome';
import ClassesManagement from './pages/center/ClassesManagement';
import ClassDetail from './pages/center/ClassDetail';
import ScheduleManagement from './pages/center/ScheduleManagement';
import StaffManagement from './pages/center/StaffManagement';
import StudentManagement from './pages/center/StudentManagement';
import UserProfile from './pages/center/UserProfile';
import AdminDashboard from './pages/center/AdminDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherClassDetail from './pages/teacher/TeacherClassDetail';
import TeacherSchedule from './pages/teacher/TeacherSchedule';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import AssignmentGrading from './pages/teacher/AssignmentGrading';
import TeacherPerformanceReport from './pages/teacher/TeacherPerformanceReport';
import { ScheduleProvider } from './context/ScheduleContext';

function App() {
  return (
    <ScheduleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/center" element={<CenterHome isAdmin={true} />} />
          <Route path="/center/classes" element={<ClassesManagement />} />
          <Route path="/center/classes/:classId" element={<ClassDetail />} />
          <Route path="/center/schedules" element={<ScheduleManagement />} />
          <Route path="/center/staff" element={<StaffManagement />} />
          <Route path="/center/students" element={<StudentManagement />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/center/dashboard" element={<AdminDashboard />} />
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/classes/:classId" element={<TeacherClassDetail />} />
          <Route path="/teacher/schedules" element={<TeacherSchedule />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/assignments/:assignmentId/grade" element={<AssignmentGrading />} />
          <Route path="/teacher/performance" element={<TeacherPerformanceReport />} />

          {/* TA Routes */}
          <Route path="/ta/classes" element={<TeacherClasses isTA={true} />} />
          <Route path="/ta/classes/:classId" element={<TeacherClassDetail isTA={true} />} />
          <Route path="/ta/schedules" element={<TeacherSchedule isTA={true} />} />
          <Route path="/ta/assignments" element={<TeacherAssignments isTA={true} />} />
          <Route path="/ta/assignments/:assignmentId/grade" element={<AssignmentGrading isTA={true} />} />
          <Route path="/ta/performance" element={<TeacherPerformanceReport isTA={true} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ScheduleProvider>
  );
}

export default App;
