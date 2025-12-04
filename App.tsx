
import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { AdminDashboard } from './components/AdminDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { ChildDashboard } from './components/ChildDashboard';
import { LoginPage } from './components/LoginPage';
import { UserRole } from './types';

const AppContent = () => {
  const { currentUser } = useApp();

  // ROUTING LOGIC
  // 1. If no user is authenticated, show the Login Page
  if (!currentUser) {
    return (
      <Layout>
        <LoginPage />
      </Layout>
    );
  }

  // 2. If authenticated, route to the correct Dashboard based on Role
  let Content: React.ReactNode;
  switch (currentUser.role) {
    case UserRole.ADMIN:
      Content = <AdminDashboard />;
      break;
    case UserRole.PARENT:
      Content = <ParentDashboard />;
      break;
    case UserRole.STUDENT:
      Content = <ChildDashboard />;
      break;
    default:
      Content = <div className="p-10 text-center text-gray-500">Unknown Role. Please contact support.</div>;
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
