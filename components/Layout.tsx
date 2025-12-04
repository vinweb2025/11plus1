
import React from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole } from '../types';
import { Users, GraduationCap, Settings, LogOut, LayoutDashboard } from 'lucide-react';

export const Layout = ({ children }: React.PropsWithChildren<{}>) => {
  const { currentUser, switchUser, logout } = useApp();

  // If no user is logged in, just render the children (Login Page) without the sidebar layout
  if (!currentUser) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col md:flex-row">
      {/* Sidebar / Navbar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-display font-bold text-kid-primary flex items-center gap-2">
            <GraduationCap className="w-8 h-8" />
            11 Plus Genius
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-semibold">
            {currentUser.role} Console
          </p>
        </div>

        <nav className="p-4 space-y-2 flex-1">
           <div className="mb-6">
              <button className="w-full text-left px-3 py-3 rounded-xl bg-gray-50 text-gray-900 font-bold flex items-center gap-3">
                 <LayoutDashboard className="w-5 h-5 text-gray-500" /> Dashboard
              </button>
           </div>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Switch View (Demo)
          </div>
          <button 
            onClick={() => switchUser(UserRole.ADMIN)}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${currentUser.role === UserRole.ADMIN ? 'bg-kid-primary text-white font-bold shadow-md shadow-indigo-200' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-4 h-4" /> Admin
          </button>
          <button 
            onClick={() => switchUser(UserRole.PARENT)}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${currentUser.role === UserRole.PARENT ? 'bg-kid-secondary text-white font-bold shadow-md shadow-cyan-200' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users className="w-4 h-4" /> Parent
          </button>
          <button 
            onClick={() => switchUser(UserRole.STUDENT)}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${currentUser.role === UserRole.STUDENT ? 'bg-kid-accent text-white font-bold shadow-md shadow-orange-200' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-3">
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{currentUser.role.toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm font-bold transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
