
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, Test, StudyPlan, Gender } from '../types';
import { 
  Users, GraduationCap, Search, TrendingUp, Clock, 
  ChevronRight, Calendar, ArrowLeft, Mail, Phone,
  BarChart3, BrainCircuit, Target, Star, MoreHorizontal, AlertTriangle, User
} from 'lucide-react';
import { ParentDashboard } from './ParentDashboard';

// We reuse the ParentDashboard logic for the "Individual Student View" 
// but wrap it to provide a "Classroom" context first.
// This component acts as the controller for the Teacher's experience.

export const TeacherDashboard = () => {
  const { currentUser, users, tests, plans } = useApp();
  
  // --- ADMIN MODE: TEACHER SELECTION ---
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const allTeachers = useMemo(() => users.filter(u => u.role === UserRole.TEACHER), [users]);
  const [adminSelectedTeacherId, setAdminSelectedTeacherId] = useState<string>('');

  // Determine Effective Teacher
  const effectiveTeacherId = isAdmin ? adminSelectedTeacherId : currentUser?.id;
  const effectiveTeacher = users.find(u => u.id === effectiveTeacherId) || (!isAdmin ? currentUser : null);

  // 1. Get Assigned Students linked to the EFFECTIVE Teacher
  // Bi-directional check
  const myStudents = useMemo(() => {
    if (!effectiveTeacherId) return [];
    return users.filter(u => 
      u.role === UserRole.STUDENT && (
        (u.linkedUserIds?.includes(effectiveTeacherId)) || 
        (effectiveTeacher?.linkedUserIds?.includes(u.id))
      )
    );
  }, [users, effectiveTeacherId, effectiveTeacher]);

  // State to toggle between Class Overview and Single Student Detail
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter students for the roster view
  const filteredStudents = myStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate Class Stats
  const getClassStats = () => {
    const classTests = tests.filter(t => myStudents.some(s => s.id === t.assignedTo) && t.completed);
    const avgScore = classTests.length > 0 
      ? Math.round(classTests.reduce((acc, t) => acc + ((t.score || 0) / t.questions.length), 0) / classTests.length * 100)
      : 0;
    
    const activeToday = myStudents.filter(s => {
       const studentPlans = plans.filter(p => p.studentId === s.id && p.date === new Date().toISOString().split('T')[0]);
       const studentTests = tests.filter(t => t.assignedTo === s.id && t.assignedDate === new Date().toISOString().split('T')[0]);
       return studentPlans.some(p => p.completed) || studentTests.some(t => t.completed);
    }).length;

    return { avgScore, activeToday, totalStudents: myStudents.length };
  };

  const stats = getClassStats();

  if (selectedStudentId) {
    return (
      <div className="animate-in fade-in slide-in-from-right duration-300">
        <div className="mb-4 flex items-center gap-4">
          <button 
            onClick={() => setSelectedStudentId(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-cyan-600 font-bold transition px-3 py-2 rounded-lg hover:bg-cyan-50"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Class
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">Managing Student</span>
        </div>
        
        {/* Render ParentDashboard but it will use initialStudentId to focus on this student */}
        <ParentDashboard initialStudentId={selectedStudentId} viewingAsId={effectiveTeacherId} />
      </div>
    );
  }

  // --- EMPTY STATE FOR ADMIN ---
  if (isAdmin && !adminSelectedTeacherId) {
     return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-full max-w-md p-6 bg-white rounded-3xl shadow-xl border border-cyan-100">
               <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Select Teacher Account to View</label>
               <select 
                  value={adminSelectedTeacherId} 
                  onChange={(e) => setAdminSelectedTeacherId(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-cyan-500"
               >
                  <option value="">-- Select a Teacher --</option>
                  {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
               <p className="text-xs text-cyan-500 mt-2 font-medium">Select a teacher to see their classroom and students.</p>
            </div>
        </div>
     )
  }

  return (
    <div className="space-y-8 pb-20">
      
      {/* Admin Impersonation Banner */}
      {isAdmin && effectiveTeacher && (
         <div className="bg-gray-900 text-white p-3 rounded-xl flex items-center justify-between shadow-lg mb-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
               <div className="bg-white/20 p-1.5 rounded-lg"><User className="w-4 h-4 text-white"/></div>
               <span className="text-sm font-bold">Viewing as Teacher: <span className="text-cyan-300">{effectiveTeacher.name}</span></span>
            </div>
            <select 
               value={adminSelectedTeacherId}
               onChange={(e) => setAdminSelectedTeacherId(e.target.value)}
               className="bg-gray-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg border border-gray-700 outline-none focus:ring-1 focus:ring-cyan-500"
            >
               {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
         </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900 flex items-center gap-3">
             <span className="bg-cyan-100 p-2 rounded-xl text-cyan-600"><Users className="w-8 h-8"/></span>
             Teacher Dashboard
          </h2>
          <p className="text-gray-500 mt-2">Overview of your class performance and student activity.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-cyan-50 rounded-full text-cyan-600"><TrendingUp className="w-4 h-4"/></div>
              <div><p className="text-[10px] text-gray-400 uppercase font-bold">Class Avg</p><p className="font-bold text-gray-800 text-lg leading-none">{stats.avgScore}%</p></div>
           </div>
           <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Clock className="w-4 h-4"/></div>
              <div><p className="text-[10px] text-gray-400 uppercase font-bold">Active Today</p><p className="font-bold text-gray-800 text-lg leading-none">{stats.activeToday}/{stats.totalStudents}</p></div>
           </div>
        </div>
      </header>

      {/* ROSTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
         <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search students by name..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 transition text-sm font-medium text-gray-900"
            />
         </div>
         <div className="text-sm text-gray-500 font-bold">
            Showing {filteredStudents.length} Students
         </div>
      </div>

      {/* STUDENT GRID */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {filteredStudents.map(student => {
              // Calculate individual stats
              const sTests = tests.filter(t => t.assignedTo === student.id);
              const sCompletedTests = sTests.filter(t => t.completed);
              const sAvg = sCompletedTests.length > 0 
                ? Math.round(sCompletedTests.reduce((acc, t) => acc + ((t.score || 0) / t.questions.length), 0) / sCompletedTests.length * 100)
                : 0;
              
              const pendingTasks = plans.filter(p => p.studentId === student.id && !p.completed).length + sTests.filter(t => !t.completed).length;

              return (
                <div 
                  key={student.id} 
                  onClick={() => setSelectedStudentId(student.id)}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-cyan-300 transition cursor-pointer group flex flex-col"
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                         <img src={student.avatar} className="w-12 h-12 rounded-full border-2 border-gray-50" alt={student.name}/>
                         <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-cyan-700 transition flex items-center gap-2">
                                {student.name}
                                {student.gender && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wide ${student.gender === Gender.BOY ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                        {student.gender}
                                    </span>
                                )}
                            </h4>
                            <p className="text-xs text-gray-500">{student.grade || 'No Grade'} • {student.school || 'No School'}</p>
                            {!student.active && (
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 mt-1 uppercase tracking-wide">
                                 <AlertTriangle className="w-3 h-3"/> Inactive
                               </span>
                            )}
                         </div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold ${sAvg >= 80 ? 'bg-green-100 text-green-700' : sAvg >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                         Avg: {sAvg}%
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                         <p className="text-[10px] text-gray-400 uppercase font-bold">Coins</p>
                         <p className="text-sm font-bold text-gray-700 flex items-center justify-center gap-1">
                           {student.coins} <span className="text-yellow-500">★</span>
                         </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                         <p className="text-[10px] text-gray-400 uppercase font-bold">Tests</p>
                         <p className="text-sm font-bold text-gray-700">{sCompletedTests.length}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                         <p className="text-[10px] text-gray-400 uppercase font-bold">Pending</p>
                         <p className={`text-sm font-bold ${pendingTasks > 5 ? 'text-red-500' : 'text-gray-700'}`}>{pendingTasks}</p>
                      </div>
                   </div>

                   <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                      <div className="flex -space-x-2">
                         <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] border border-white">M</div>
                         <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-[10px] border border-white">E</div>
                      </div>
                      <div className="text-cyan-600 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                         Manage Student <ChevronRight className="w-4 h-4"/>
                      </div>
                   </div>
                </div>
              );
           })}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No Students Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2">
              {searchTerm ? `No students match "${searchTerm}"` : (isAdmin ? "The selected teacher has no assigned students." : "You don't have any students assigned to your class yet.")}
            </p>
         </div>
      )}
    </div>
  );
};
