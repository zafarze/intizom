import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import Statistics from './pages/admin/Statistics';
import Monitoring from './pages/admin/Monitoring';
import Comparison from './pages/admin/Comparison';
import Management from './pages/admin/Management';
import Settings from './pages/admin/Settings';


// 1. Умный компонент-перенаправитель для корня (/)
const RoleBasedRedirect = () => {
  const role = localStorage.getItem('user_role');

  if (role === 'student') return <Navigate to="/student" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  // По умолчанию или если админ
  return <Navigate to="/admin" replace />;
};

// 2. Улучшенный Защитник: проверяет токен И разрешенные роли
const ProtectedRoute = ({
  children,
  allowedRoles
}: {
  children: React.ReactNode,
  allowedRoles?: string[]
}) => {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role');

  // Если нет токена — на логин
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Если роли переданы, и текущая роль юзера в них не входит — выгоняем на его главную
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <RoleBasedRedirect />;
  }

  return children;
};

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '16px',
            background: '#334155',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
          }
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Оборачиваем весь Layout в базовую защиту (только для авторизованных) */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

          {/* Умный редирект при заходе на голый домен (/) */}
          <Route index element={<RoleBasedRedirect />} />

          {/* ================= АДМИНСКАЯ ЗОНА (ТОЛЬКО ДИРЕКТОР) ================= */}
          <Route path="admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* ================= ОБЩИЕ РАЗДЕЛЫ (АДМИН + УЧИТЕЛЬ) ================= */}
          <Route path="statistics" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <Statistics />
            </ProtectedRoute>
          } />
          <Route path="monitoring" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <Monitoring />
            </ProtectedRoute>
          } />
          <Route path="comparison" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <Comparison />
            </ProtectedRoute>
          } />
          <Route path="management" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <Management />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <Settings />
            </ProtectedRoute>
          } />

          {/* ================= ЗОНА УЧИТЕЛЯ ================= */}
          <Route path="teacher" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />

          {/* ================= ЗОНА УЧЕНИКА ================= */}
          <Route path="student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />

        </Route>

        <Route path="*" element={
          <div className="flex items-center justify-center h-screen text-2xl font-bold text-slate-400">
            Саҳифа ёфт нашуд (404)
          </div>
        } />
      </Routes>
    </>
  );
}
