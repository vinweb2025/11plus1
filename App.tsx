import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { AdminDashboard } from './components/AdminDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ChildDashboard } from './components/ChildDashboard';
import { LoginPage } from './components/LoginPage';
import { UserRole } from './types';
import { Loader2, AlertTriangle } from 'lucide-react';

const AppContent = () => {
  const { currentUser, viewRole, isLoading } = useApp();

  // 1. Show Global Loader while App is Initializing (Checking Session)
  // This prevents race conditions where a user tries to login while session check is in progress
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Loading 11+ Gen67...</p>
      </div>
    );
  }

  // 2. If no user is authenticated, show the Login Page
  if (!currentUser) {
    return (
      <Layout>
        <LoginPage />
      </Layout>
    );
  }

  // 3. If authenticated, route to the correct Dashboard based on Role
  // Priority: Use 'viewRole' if set (for Admins viewing others), otherwise currentUser.role
  const currentRole = viewRole || currentUser.role;

  let Content: React.ReactNode;
  switch (currentRole) {
    case UserRole.ADMIN:
      Content = <AdminDashboard />;
      break;
    case UserRole.PARENT:
      Content = <ParentDashboard />;
      break;
    case UserRole.TEACHER:
      Content = <TeacherDashboard />;
      break;
    case UserRole.STUDENT:
      Content = <ChildDashboard />;
      break;
    default:
      Content = (
        <div className="flex h-screen items-center justify-center p-8 bg-gray-50 text-center">
           <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
             <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
             <h2 className="text-2xl font-bold text-gray-900 mb-2">Unknown Role</h2>
             <p className="text-gray-500 mb-4">
               Your account has the role <strong>"{currentRole}"</strong> which is not recognized by the system.
             </p>
             <p className="text-sm text-gray-400">Please contact support or an administrator.</p>
           </div>
        </div>
      );
  }

  return (
    <Layout>
      {Content}
    </Layout>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;