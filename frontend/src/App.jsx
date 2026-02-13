import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Pricing from './pages/Pricing';
import CenterHome from './pages/center/CenterHome';
import ClassesManagement from './pages/center/ClassesManagement';
import ScheduleManagement from './pages/center/ScheduleManagement';
import StaffManagement from './pages/center/StaffManagement';
import StudentManagement from './pages/center/StudentManagement';
import UserProfile from './pages/center/UserProfile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/center" element={<CenterHome />} />
        <Route path="/center/classes" element={<ClassesManagement />} />
        <Route path="/center/schedules" element={<ScheduleManagement />} />
        <Route path="/center/staff" element={<StaffManagement />} />
        <Route path="/center/students" element={<StudentManagement />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
