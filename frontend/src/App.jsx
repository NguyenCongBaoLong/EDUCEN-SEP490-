import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
import TeacherMailbox from './pages/teacher/TeacherMailbox';
import StudentClasses from './pages/student/StudentClasses';
import StudentSchedule from './pages/student/StudentSchedule';
import StudentClassDetail from './pages/student/StudentClassDetail';
import StudentMailbox from './pages/student/StudentMailbox';
import ParentClasses from './pages/parent/ParentClasses';
import ParentSchedule from './pages/parent/ParentSchedule';
import FamilyInvoices from './pages/parent/FamilyInvoices';
import ParentMailbox from './pages/parent/ParentMailbox';
import MyInvoices from './pages/student/MyInvoices';
import TuitionManagement from './pages/center/TuitionManagement';
import RevenueReport from './pages/center/RevenueReport';
import SubscriptionPlans from './pages/center/SubscriptionPlans';
import PaymentResult from './pages/PaymentResult';
import SystemAdminDashboard from './pages/sysadmin/SystemAdminDashboard';
import TenantManagement from './pages/sysadmin/TenantManagement';
import PlansManagement from './pages/sysadmin/PlansManagement';
import ZaloOAConfig from './pages/sysadmin/ZaloOAConfig';
import RefundManagement from './pages/sysadmin/RefundManagement';
import SystemAdminLogin from './pages/auth/SystemAdminLogin';
import { ScheduleProvider } from './context/ScheduleContext';
import { AuthProvider } from './context/AuthContext';
import { ChildProvider } from './context/ChildContext';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        <ChildProvider>
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
              <Route path="/payment/result" element={<PaymentResult />} />
              <Route path="/center" element={<CenterHome isAdmin={true} />} />

              {/* ── Admin Routes (chỉ Admin) ── */}
              <Route path="/center/classes" element={<PrivateRoute allowedRoles={['Admin']}><ClassesManagement /></PrivateRoute>} />
              <Route path="/center/classes/:classId" element={<PrivateRoute allowedRoles={['Admin']}><ClassDetail /></PrivateRoute>} />
              <Route path="/center/schedules" element={<PrivateRoute allowedRoles={['Admin']}><ScheduleManagement /></PrivateRoute>} />
              <Route path="/center/staff" element={<PrivateRoute allowedRoles={['Admin']}><StaffManagement /></PrivateRoute>} />
              <Route path="/center/students" element={<PrivateRoute allowedRoles={['Admin']}><StudentManagement /></PrivateRoute>} />
              <Route path="/center/parents" element={<PrivateRoute allowedRoles={['Admin']}><ParentManagement /></PrivateRoute>} />
              <Route path="/center/dashboard" element={<PrivateRoute allowedRoles={['Admin']}><AdminDashboard /></PrivateRoute>} />
              <Route path="/center/tuition" element={<PrivateRoute allowedRoles={['Admin']}><TuitionManagement /></PrivateRoute>} />
              <Route path="/center/tuition/:classId" element={<PrivateRoute allowedRoles={['Admin']}><TuitionManagement /></PrivateRoute>} />
              <Route path="/center/revenue" element={<PrivateRoute allowedRoles={['Admin']}><RevenueReport /></PrivateRoute>} />
              <Route path="/center/subscription" element={<PrivateRoute allowedRoles={['Admin']}><SubscriptionPlans /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute allowedRoles={['Admin', 'Teacher', 'Assistant', 'Student', 'Parent']}><UserProfile /></PrivateRoute>} />

              {/* ── Teacher Routes (chỉ Teacher) ── */}
              <Route path="/teacher/classes" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherClasses /></PrivateRoute>} />
              <Route path="/teacher/classes/:classId" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherClassDetail /></PrivateRoute>} />
              <Route path="/teacher/schedules" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherSchedule /></PrivateRoute>} />
              <Route path="/teacher/assignments" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherAssignments /></PrivateRoute>} />
              <Route path="/teacher/assignments/:assignmentId/grade" element={<PrivateRoute allowedRoles={['Teacher']}><AssignmentGrading /></PrivateRoute>} />
              <Route path="/teacher/performance" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherPerformanceReport /></PrivateRoute>} />
              <Route path="/teacher/mailbox" element={<PrivateRoute allowedRoles={['Teacher']}><TeacherMailbox /></PrivateRoute>} />

              {/* ── TA Routes (chỉ Assistant) ── */}
              <Route path="/ta/classes" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherClasses isTA={true} /></PrivateRoute>} />
              <Route path="/ta/classes/:classId" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherClassDetail isTA={true} /></PrivateRoute>} />
              <Route path="/ta/schedules" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherSchedule isTA={true} /></PrivateRoute>} />
              <Route path="/ta/performance" element={<PrivateRoute allowedRoles={['Assistant']}><TeacherPerformanceReport isTA={true} /></PrivateRoute>} />

              {/* ── Student Routes (chỉ Student) ── */}
              <Route path="/student/classes" element={<PrivateRoute allowedRoles={['Student']}><StudentClasses /></PrivateRoute>} />
              <Route path="/student/classes/:classId" element={<PrivateRoute allowedRoles={['Student']}><StudentClassDetail /></PrivateRoute>} />
              <Route path="/student/schedules" element={<PrivateRoute allowedRoles={['Student']}><StudentSchedule /></PrivateRoute>} />
              <Route path="/student/invoices" element={<PrivateRoute allowedRoles={['Student']}><MyInvoices /></PrivateRoute>} />
              <Route path="/student/mailbox" element={<PrivateRoute allowedRoles={['Student']}><StudentMailbox /></PrivateRoute>} />

              {/* ── Parent Routes (Parent) ── */}
                <Route path="/parent/*" element={
                <Routes>
                  <Route path="classes" element={<PrivateRoute allowedRoles={['Parent']}><ParentClasses /></PrivateRoute>} />
                  <Route path="schedule" element={<PrivateRoute allowedRoles={['Parent']}><ParentSchedule /></PrivateRoute>} />
                  <Route path="invoices" element={<PrivateRoute allowedRoles={['Parent']}><MyInvoices /></PrivateRoute>} />
                  <Route path="family-invoices" element={<PrivateRoute allowedRoles={['Parent']}><FamilyInvoices /></PrivateRoute>} />
                  <Route path="mailbox" element={<PrivateRoute allowedRoles={['Parent']}><ParentMailbox /></PrivateRoute>} />
                  <Route path="*" element={<Navigate to="/parent/classes" replace />} />
                </Routes>
              } />

              {/* ── System Admin Routes ── */}
              <Route path="/sysadmin/login" element={<SystemAdminLogin />} />
              <Route path="/sysadmin" element={<PrivateRoute allowedRoles={['SystemAdmin']}><Navigate to="/sysadmin/dashboard" /></PrivateRoute>} />
              <Route path="/sysadmin/dashboard" element={<PrivateRoute allowedRoles={['SystemAdmin']}><SystemAdminDashboard /></PrivateRoute>} />
              <Route path="/sysadmin/tenants" element={<PrivateRoute allowedRoles={['SystemAdmin']}><TenantManagement /></PrivateRoute>} />
              <Route path="/sysadmin/plans" element={<PrivateRoute allowedRoles={['SystemAdmin']}><PlansManagement /></PrivateRoute>} />
              <Route path="/sysadmin/zalo-oa" element={<PrivateRoute allowedRoles={['SystemAdmin']}><ZaloOAConfig /></PrivateRoute>} />
              <Route path="/sysadmin/refunds" element={<PrivateRoute allowedRoles={['SystemAdmin']}><RefundManagement /></PrivateRoute>} />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </ScheduleProvider>
        </ChildProvider>
      </AuthProvider>
    </>
  );
}

export default App;
