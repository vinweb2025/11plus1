
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole } from '../types';
import { Users, GraduationCap, Settings, LogOut, LayoutDashboard, UserCheck, Menu, X, Eye } from 'lucide-react';

export const Layout = ({ children }: React.PropsWithChildren<{}>) => {
  const { currentUser, switchUser, logout, viewRole } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If no user is logged in, just render the children (Login Page) without the sidebar layout
  if (!currentUser) {
    return <>{children}</>;
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Determine which role is currently active/visible
  const currentViewRole = viewRole || currentUser.role;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col md:flex-row">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2 font-display font-bold text-kid-primary text-xl tracking-tight">
          <div className="bg-kid-primary/10 p-1.5 rounded-lg">
            <GraduationCap className="w-6 h-6 text-kid-primary" />
          </div>
          11+ Yodha
        </div>
        <button onClick={toggleSidebar} className="p-2 text-gray-600 hover:bg-gray-100 hover:text-kid-primary rounded-xl transition-colors">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* OVERLAY for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100/80 shadow-soft flex flex-col h-screen transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:sticky md:top-0
      `}>
        <div className="p-8 pb-4 hidden md:block">
          <h1 className="text-2xl font-display font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200">
               <GraduationCap className="w-6 h-6" />
            </div>
            11+ Yodha
          </h1>
          <div className="mt-4 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 inline-block">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${currentUser.role === UserRole.ADMIN ? 'bg-orange-500' : currentUser.role === UserRole.TEACHER ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              {currentUser.role} Console
            </p>
          </div>
        </div>

        {/* Mobile Sidebar Header */}
        <div className="p-4 border-b border-gray-100 md:hidden flex items-center justify-between bg-white">
           <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Navigation</span>
           <button onClick={closeSidebar} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400"/></button>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
           <div className="mb-8">
              <button className="w-full text-left px-4 py-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-slate-100 text-slate-800 font-bold flex items-center gap-3 shadow-sm hover:shadow-md transition-all group">
                 <LayoutDashboard className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" /> 
                 Dashboard
              </button>
           </div>

          {/* Role Switching for ADMINS ONLY */}
          {currentUser.role === UserRole.ADMIN && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-4 flex items-center gap-2">
                <Eye className="w-3 h-3"/> View As
              </div>
              <button 
                onClick={() => { switchUser(UserRole.ADMIN); closeSidebar(); }}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 font-medium ${currentViewRole === UserRole.ADMIN ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Settings className={`w-4 h-4 ${currentViewRole === UserRole.ADMIN ? 'text-blue-600' : 'text-slate-400'}`} /> Admin View
              </button>
              <button 
                onClick={() => { switchUser(UserRole.PARENT); closeSidebar(); }}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 font-medium ${currentViewRole === UserRole.PARENT ? 'bg-cyan-50 text-cyan-700 border border-cyan-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Users className={`w-4 h-4 ${currentViewRole === UserRole.PARENT ? 'text-cyan-600' : 'text-slate-400'}`} /> Parent View
              </button>
              <button 
                onClick={() => { switchUser(UserRole.TEACHER); closeSidebar(); }}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 font-medium ${currentViewRole === UserRole.TEACHER ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <UserCheck className={`w-4 h-4 ${currentViewRole === UserRole.TEACHER ? 'text-emerald-600' : 'text-slate-400'}`} /> Teacher View
              </button>
              <button 
                onClick={() => { switchUser(UserRole.STUDENT); closeSidebar(); }}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 font-medium ${currentViewRole === UserRole.STUDENT ? 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <GraduationCap className={`w-4 h-4 ${currentViewRole === UserRole.STUDENT ? 'text-orange-600' : 'text-slate-400'}`} /> Student View
              </button>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 p-3 mb-4 rounded-2xl bg-slate-50 border border-slate-100">
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm shrink-0 object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-wide">{currentUser.role}</p>
            </div>
          </div>
          <button 
            onClick={(e) => {
               e.preventDefault();
               logout();
            }}
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 p-3 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-4 md:p-8 lg:p-10 relative">
        <div className="max-w-7xl mx-auto h-full pb-20 md:pb-0 animate-in fade-in duration-500 slide-in-from-bottom-2">
          {children}
        </div>
      </main>
    </div>
  );
};
