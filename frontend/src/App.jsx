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
import ParentManagement from './pages/center/ParentManagement';
import UserProfile from './pages/center/UserProfile';
import AdminDashboard from './pages/center/AdminDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherClassDetail from './pages/teacher/TeacherClassDetail';
import TeacherSchedule from './pages/teacher/TeacherSchedule';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import AssignmentGrading from './pages/teacher/AssignmentGrading';
import TeacherPerformanceReport from './pages/teacher/TeacherPerformanceReport';
import StudentClasses from './pages/student/StudentClasses';
import StudentSchedule from './pages/student/StudentSchedule';
import StudentClassDetail from './pages/student/StudentClassDetail';
import ParentClasses from './pages/parent/ParentClasses';
import ParentSchedule from './pages/parent/ParentSchedule';
import ParentFeedback from './pages/parent/ParentFeedback';
import SystemAdminDashboard from './pages/sysadmin/SystemAdminDashboard';
import TenantManagement from './pages/sysadmin/TenantManagement';
import PlansManagement from './pages/sysadmin/PlansManagement';
import SystemAdminLogin from './pages/auth/SystemAdminLogin';
import { ScheduleProvider } from './context/ScheduleContext';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <ScheduleProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public Routes ── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/center" element={<CenterHome isAdmin={true} />} />

            {/* ── Admin Routes (chỉ Admin) ── */}
            <Route path="/center/classes" element={<PrivateRoute allowedRoles={['Admin']}><ClassesManagement /></PrivateRoute>} />
            <Route path="/center/classes/:classId" element={<PrivateRoute allowedRoles={['Admin']}><ClassDetail /></PrivateRoute>} />
            <Route path="/center/schedules" element={<PrivateRoute allowedRoles={['Admin']}><ScheduleManagement /></PrivateRoute>} />
            <Route path="/center/staff" element={<PrivateRoute allowedRoles={['Admin']}><StaffManagement /></PrivateRoute>} />
            <Route path="/center/students" element={<PrivateRoute allowedRoles={['Admin']}><StudentManagement /></PrivateRoute>} />
            <Route path="/center/parents" element={<PrivateRoute allowedRoles={['Admin']}><ParentManagement /></PrivateRoute>} />
            <Route path="/center/dashboard" element={<PrivateRoute allowedRoles={['Admin']}><AdminDashboard /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute allowedRoles={['Admin', 'Teacher', 'Assistant', 'Student', 'Parent']}><UserProfile /></PrivateRoute>} />

            {/* ── Teacher Routes (chỉ Teacher) ── */}
            <Route path="/teacher/classes" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherClasses /></PrivateRoute>} />
            <Route path="/teacher/classes/:classId" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherClassDetail /></PrivateRoute>} />
            <Route path="/teacher/schedules" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherSchedule /></PrivateRoute>} />
            <Route path="/teacher/assignments" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherAssignments /></PrivateRoute>} />
            <Route path="/teacher/assignments/:assignmentId/grade" element={<PrivateRoute allowedRoles={['Teacher']}><AssignmentGrading /></PrivateRoute>} />
            <Route path="/teacher/performance" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherPerformanceReport /></PrivateRoute>} />

            {/* ── TA Routes (chỉ Assistant) ── */}
            <Route path="/ta/classes" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherClasses isTA={true} /></PrivateRoute>} />
            <Route path="/ta/classes/:classId" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherClassDetail isTA={true} /></PrivateRoute>} />
            <Route path="/ta/schedules" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherSchedule isTA={true} /></PrivateRoute>} />
            <Route path="/ta/assignments" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherAssignments isTA={true} /></PrivateRoute>} />
            <Route path="/ta/assignments/:assignmentId/grade" element={<PrivateRoute allowedRoles={['Assistant']}><AssignmentGrading isTA={true} /></PrivateRoute>} />
            <Route path="/ta/performance" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherPerformanceReport isTA={true} /></PrivateRoute>} />

            {/* ── Student Routes (chỉ Student) ── */}
            <Route path="/student/classes" element={<PrivateRoute allowedRoles={['Student']}><StudentClasses /></PrivateRoute>} />
            <Route path="/student/classes/:classId" element={<PrivateRoute allowedRoles={['Student']}><StudentClassDetail /></PrivateRoute>} />
            <Route path="/student/schedules" element={<PrivateRoute allowedRoles={['Student']}><StudentSchedule /></PrivateRoute>} />

            {/* ── Parent Routes (━━ Parent) ── */}
            <Route path="/parent/classes" element={<PrivateRoute allowedRoles={['Parent']}><ParentClasses /></PrivateRoute>} />
            <Route path="/parent/schedule" element={<PrivateRoute allowedRoles={['Parent']}><ParentSchedule /></PrivateRoute>} />
            <Route path="/parent/feedback" element={<PrivateRoute allowedRoles={['Parent']}><ParentFeedback /></PrivateRoute>} />

            {/* ── System Admin Routes ── */}
            <Route path="/sysadmin/login" element={<SystemAdminLogin />} />
            <Route path="/sysadmin" element={<Navigate to="/sysadmin/dashboard" />} />
            <Route path="/sysadmin/dashboard" element={<SystemAdminDashboard />} />
            <Route path="/sysadmin/tenants" element={<TenantManagement />} />
            <Route path="/sysadmin/plans" element={<PlansManagement />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </ScheduleProvider>
    </AuthProvider>
  );
}

export default App;
