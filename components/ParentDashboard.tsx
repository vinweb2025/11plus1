
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateTestQuestions } from '../services/geminiService';
import { 
  Calendar, BrainCircuit, CheckCircle, Loader2, ChevronLeft, ChevronRight, 
  Plus, X, BookOpen, Clock, Target, AlertCircle, BarChart3, TrendingUp,
  MoreHorizontal, Eye, Check, Smile, Search, Printer, Users
} from 'lucide-react';
import { UserRole, TestType, DifficultyLevel, TaskStatus, Test } from '../types';
import { ChildDashboard } from './ChildDashboard';

// Helper: Get days in month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
};

export const ParentDashboard = () => {
  const { subjects, topics, users, addPlan, addTest, plans, tests, currentUser, getUser } = useApp();
  
  // --- STRICT RELATIONSHIP FILTERING ---
  // Only show students that are linked to this logged-in Parent
  const myStudents = users.filter(u => 
    u.role === UserRole.STUDENT && 
    currentUser?.linkedUserIds?.includes(u.id)
  );

  // --- CALENDAR STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // --- MODAL STATES ---
  const [modalMode, setModalMode] = useState<'none' | 'study' | 'test' | 'report'>('none');
  const [selectedReportTest, setSelectedReportTest] = useState<Test | null>(null);
  
  // --- PREVIEW STATE ---
  const [viewAsStudent, setViewAsStudent] = useState(false);
  
  // --- FORM STATES ---
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  // Effect to set default student or validate selection
  useEffect(() => {
    if (myStudents.length > 0) {
      // If no student selected, or selected student is not in my list (security check), default to first
      if (!selectedStudentId || !myStudents.find(s => s.id === selectedStudentId)) {
        setSelectedStudentId(myStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [myStudents, selectedStudentId]);

  // Study Form
  const [studySubjectId, setStudySubjectId] = useState(subjects[0]?.id || '');
  const [studyTopicId, setStudyTopicId] = useState('');
  const [studySubTopicIds, setStudySubTopicIds] = useState<string[]>([]);
  const [studyDuration, setStudyDuration] = useState(30);
  const [studyNotes, setStudyNotes] = useState('');

  // Test Form
  const [testSubjectId, setTestSubjectId] = useState(subjects[0]?.id || '');
  const [testTopicId, setTestTopicId] = useState('');
  const [testSubTopicIds, setTestSubTopicIds] = useState<string[]>([]);
  const [testDifficulty, setTestDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [testQuestionCount, setTestQuestionCount] = useState(10);
  const [testDuration, setTestDuration] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- DERIVED DATA ---
  // Only fetch plans/tests for the SELECTED student (who is verified to be linked)
  const selectedStudentPlans = plans.filter(p => p.studentId === selectedStudentId);
  const selectedStudentTests = tests.filter(t => t.assignedTo === selectedStudentId);
  
  const selectedDayPlans = selectedStudentPlans.filter(p => p.date === selectedDate.toISOString().split('T')[0]);
  const selectedDayTests = selectedStudentTests.filter(t => t.assignedDate === selectedDate.toISOString().split('T')[0]);

  const baselineTest = selectedStudentTests.find(t => t.type === TestType.BASELINE);

  // Split Logic
  const pendingPlans = selectedDayPlans.filter(p => !p.completed);
  const completedPlans = selectedDayPlans.filter(p => p.completed);

  const pendingTests = selectedDayTests.filter(t => !t.completed);
  const completedTests = selectedDayTests.filter(t => t.completed);

  // --- HANDLERS ---
  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleViewReport = (test: Test) => {
    setSelectedReportTest(test);
    setModalMode('report');
  };

  const handlePrintTest = (test: Test) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${test.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .question { margin-bottom: 30px; page-break-inside: avoid; }
            .q-text { font-weight: bold; margin-bottom: 10px; font-size: 16px; }
            .options { margin-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .option { margin-bottom: 5px; display: flex; items-center; }
            .circle { display: inline-block; width: 16px; height: 16px; border: 2px solid #333; border-radius: 50%; margin-right: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${test.title}</h1>
            <p>Date: ${test.assignedDate} | Duration: ${test.duration} mins | Subject: ${subjects.find(s => s.id === test.subjectId)?.name}</p>
            <br/>
            <p>Student Name: __________________________ Score: ______ / ${test.questions.length}</p>
          </div>
          ${test.questions.map((q, i) => `
            <div class="question">
              <div class="q-text">${i + 1}. ${q.text}</div>
              <div class="options">
                ${q.options.map(opt => `
                  <div class="option"><span class="circle"></span>${opt}</div>
                `).join('')}
              </div>
            </div>
          `).join('')}
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Assign Study Task
  const handleAssignStudy = () => {
    if (!studySubjectId || !studyTopicId || !selectedStudentId) return;
    
    addPlan({
      id: `plan-${Date.now()}`,
      parentId: currentUser?.id || 'unknown',
      studentId: selectedStudentId,
      date: selectedDate.toISOString().split('T')[0],
      subjectId: studySubjectId,
      topicId: studyTopicId,
      subTopicIds: studySubTopicIds,
      duration: studyDuration,
      notes: studyNotes,
      status: TaskStatus.NOT_STARTED,
      completed: false
    });
    setModalMode('none');
    setStudyNotes('');
  };

  // Generate & Assign Test
  const handleAssignTest = async () => {
    if (!testSubjectId || !selectedStudentId) return;
    setIsGenerating(true);

    const subject = subjects.find(s => s.id === testSubjectId);
    const topic = topics.find(t => t.id === testTopicId);
    const subTopicNames = topic?.subTopics
      .filter(st => testSubTopicIds.includes(st.id))
      .map(st => st.name) || [];

    const questions = await generateTestQuestions(
      subject?.name || '',
      topic?.name || null,
      subTopicNames,
      testDifficulty,
      testQuestionCount,
      false
    );

    addTest({
      id: `test-${Date.now()}`,
      type: TestType.NORMAL,
      title: topic ? `${topic.name} Quiz` : `${subject?.name} Test`,
      subjectId: testSubjectId,
      topicId: testTopicId,
      subTopicIds: testSubTopicIds,
      questions,
      createdBy: currentUser?.id || 'unknown',
      assignedTo: selectedStudentId,
      assignedDate: selectedDate.toISOString().split('T')[0],
      duration: testDuration,
      status: TaskStatus.NOT_STARTED,
      completed: false
    });

    setIsGenerating(false);
    setModalMode('none');
  };

  // Generate Baseline Test
  const handleAssignBaseline = async () => {
    if (!selectedStudentId) return;
    setIsGenerating(true);

    const subject = subjects[0]; // Default to Maths or allow selection
    const questions = await generateTestQuestions(subject.name, null, [], 'Mixed', 50, true);

    addTest({
      id: `baseline-${Date.now()}`,
      type: TestType.BASELINE,
      title: `${subject.name} Baseline Assessment`,
      subjectId: subject.id,
      questions,
      createdBy: currentUser?.id || 'unknown',
      assignedTo: selectedStudentId,
      assignedDate: new Date().toISOString().split('T')[0],
      duration: 45,
      status: TaskStatus.NOT_STARTED,
      completed: false
    });

    setIsGenerating(false);
  };

  // --- CALENDAR RENDERER ---
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const days = [];

    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[3rem] bg-gray-50/30"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
      const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;
      const dayPlans = selectedStudentPlans.filter(p => p.date === dateStr);
      const dayTests = selectedStudentTests.filter(t => t.assignedDate === dateStr);
      const hasActivity = dayPlans.length > 0 || dayTests.length > 0;
      
      // Status Color Logic
      let statusClass = "bg-white border-gray-100 hover:border-indigo-300";
      if (isSelected) {
        statusClass = "bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105 z-10";
      } else if (hasActivity) {
        const allCompleted = [...dayPlans, ...dayTests].every(t => t.completed);
        const someCompleted = [...dayPlans, ...dayTests].some(t => t.completed);
        const isPast = new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
        
        if (allCompleted) statusClass = "bg-green-50 border-green-200";
        else if (isPast && !allCompleted) statusClass = "bg-red-50 border-red-200";
        else if (someCompleted) statusClass = "bg-orange-50 border-orange-200";
        else statusClass = "bg-blue-50 border-blue-200";
      }

      days.push(
        <div 
          key={day} 
          onClick={() => handleDayClick(day)}
          className={`min-h-[3.5rem] md:min-h-[4rem] rounded-xl p-2 cursor-pointer transition-all flex flex-col justify-between border ${statusClass}`}
        >
          <span className={`font-bold text-sm ${isSelected ? 'text-white' : (hasActivity ? 'text-gray-800' : 'text-gray-400')}`}>{day}</span>
          <div className="flex gap-1 flex-wrap">
            {dayPlans.map((_, i) => <div key={`p-${i}`} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-orange-200' : 'bg-orange-400'}`}></div>)}
            {dayTests.map((_, i) => <div key={`t-${i}`} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-200' : 'bg-indigo-500'}`}></div>)}
          </div>
        </div>
      );
    }
    return days;
  };

  // --- PREVIEW MODE RENDER ---
  if (viewAsStudent) {
    const studentName = myStudents.find(s => s.id === selectedStudentId)?.name || 'Student';
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col h-screen w-screen">
         <div className="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md shrink-0">
             <div className="flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-full"><Eye className="w-5 h-5" /></div>
               <div>
                 <span className="font-bold block text-lg">Viewing as {studentName}</span>
                 <span className="text-xs text-indigo-200 uppercase tracking-wide font-bold">Preview Mode</span>
               </div>
             </div>
             <button 
               onClick={() => setViewAsStudent(false)} 
               className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-2 rounded-xl font-bold text-sm transition shadow-sm"
             >
                 Exit Student View
             </button>
         </div>
         <div className="flex-1 overflow-hidden">
             <div className="h-full overflow-y-auto p-4 md:p-8">
               <ChildDashboard previewStudentId={selectedStudentId} />
             </div>
         </div>
      </div>
    )
  }
  
  // --- EMPTY STATE IF NO STUDENTS LINKED ---
  if (myStudents.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
         <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-12 h-12 text-gray-400" />
         </div>
         <div className="max-w-md">
           <h2 className="text-2xl font-bold text-gray-800 mb-2">No Students Linked</h2>
           <p className="text-gray-500 mb-6">You need to have students linked to your account to plan schedules and tests. Please ask your administrator to link your child's account.</p>
           <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
             <strong>Admin Tip:</strong> Go to User Management &gt; Edit User &gt; Family Connections to link a student.
           </div>
         </div>
      </div>
    )
  }

  // --- MAIN DASHBOARD RENDER ---
  return (
    <div className="space-y-8 pb-20">
      
      {/* 1. TOP HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Parent Dashboard</h2>
          <p className="text-gray-500 mt-1">Plan, assign, and track progress.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View as Student Button */}
          <button 
            onClick={() => setViewAsStudent(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 hover:text-indigo-600 transition shadow-sm"
            title="View dashboard as student"
          >
            <Eye className="w-5 h-5" /> <span className="hidden sm:inline">View as Student</span>
          </button>

          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
            <label className="text-sm font-bold text-gray-500 pl-2">Student:</label>
            <select 
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-bold outline-none"
            >
              {myStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: CALENDAR (More Compact) */}
        <div className="space-y-6">
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-1">
                  <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>
              
              {/* Grid Header */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-xs font-bold text-gray-400 uppercase tracking-wide">{d}</div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {renderCalendarDays()}
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: STATS & ACTIONS */}
        <div className="space-y-6">
           
           {/* BASELINE TEST CARD */}
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
             <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 relative z-10">
               <Target className="w-5 h-5 text-indigo-600" /> Baseline Assessment
             </h3>
             
             {baselineTest ? (
                <div className="text-center py-4 relative z-10">
                   {baselineTest.completed ? (
                     <div className="flex items-center justify-center gap-4">
                       <div className="text-right">
                         <div className="text-3xl font-display font-bold text-green-500">{Math.round((baselineTest.score! / baselineTest.questions.length) * 100)}%</div>
                         <p className="text-xs text-gray-400">Score</p>
                       </div>
                       <div className="h-8 w-[1px] bg-gray-200"></div>
                       <div className="text-left">
                         <p className="text-sm font-bold text-gray-800">Completed</p>
                         <p className="text-xs text-gray-400">{baselineTest.assignedDate}</p>
                       </div>
                       <button onClick={() => handleViewReport(baselineTest)} className="ml-4 p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition shadow-sm"><Eye className="w-5 h-5"/></button>
                     </div>
                   ) : (
                     <div>
                       <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold mb-3">Pending</div>
                       <p className="text-sm text-gray-600">Assigned for {baselineTest.assignedDate}</p>
                     </div>
                   )}
                </div>
             ) : (
               <div className="text-center py-4 relative z-10">
                 <p className="text-sm text-gray-600 mb-4">Assign a diagnostic test to identify strengths.</p>
                 <button 
                   onClick={handleAssignBaseline}
                   disabled={isGenerating}
                   className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition flex justify-center items-center gap-2 text-sm"
                 >
                   {isGenerating ? <Loader2 className="animate-spin w-4 h-4"/> : <BrainCircuit className="w-4 h-4"/>}
                   Create Baseline Test
                 </button>
               </div>
             )}
           </div>

           {/* PROGRESS SUMMARY */}
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" /> Weekly Overview
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-gray-50 rounded-2xl">
                    <span className="text-xs font-medium text-gray-500 uppercase">Tests</span>
                    <div className="font-display font-bold text-2xl text-gray-900 mt-1">{selectedStudentTests.filter(t => t.completed).length}<span className="text-sm text-gray-400 font-sans">/{selectedStudentTests.length}</span></div>
                 </div>
                 <div className="p-4 bg-gray-50 rounded-2xl">
                    <span className="text-xs font-medium text-gray-500 uppercase">Tasks</span>
                    <div className="font-display font-bold text-2xl text-gray-900 mt-1">{selectedStudentPlans.filter(p => p.completed).length}<span className="text-sm text-gray-400 font-sans">/{selectedStudentPlans.length}</span></div>
                 </div>
              </div>
           </div>

        </div>
      </div>

      {/* 3. SELECTED DAY DETAILS SECTION (Below Calendar) */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
               <h3 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
                 <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg text-lg font-sans">{selectedDate.getDate()}</span>
                 {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long' })}
               </h3>
               <p className="text-gray-500 mt-1">Manage assignments and tests for this day.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalMode('study')} className="px-5 py-2.5 bg-orange-50 text-orange-700 rounded-xl font-bold hover:bg-orange-100 transition flex items-center gap-2 border border-orange-100">
                 <BookOpen className="w-4 h-4" /> Plan Study
              </button>
              <button onClick={() => setModalMode('test')} className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition flex items-center gap-2 border border-indigo-100">
                 <BrainCircuit className="w-4 h-4" /> Create Test
              </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* COLUMN 1: STUDY ASSIGNMENTS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                 <h4 className="font-bold text-gray-800 text-lg">Study Assignments</h4>
                 <div className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-md">{selectedDayPlans.length} Total</div>
              </div>
              
              {selectedDayPlans.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400">
                   <p className="text-sm">No study tasks planned for today.</p>
                </div>
              ) : (
                <>
                  {/* PENDING PLANS */}
                  <div>
                    <h5 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-3 flex justify-between">
                      To Do <span>{pendingPlans.length}</span>
                    </h5>
                    {pendingPlans.length === 0 ? (
                      <p className="text-sm text-gray-400 italic pl-2">All tasks completed!</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingPlans.map(plan => {
                          const subject = subjects.find(s => s.id === plan.subjectId);
                          const topic = topics.find(t => t.id === plan.topicId);
                          return (
                            <div key={plan.id} className="p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 bg-white hover:border-orange-200 transition">
                              <div className="mt-1.5 w-3 h-3 rounded-full flex-shrink-0 bg-orange-400"></div>
                              <div>
                                  <p className="font-bold text-gray-800 text-base">{topic?.name}</p>
                                  <p className="text-xs text-gray-500 font-medium mt-1">{subject?.name} • {plan.duration} mins</p>
                                  {plan.notes && <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded border border-gray-100">{plan.notes}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* COMPLETED PLANS */}
                  {completedPlans.length > 0 && (
                    <div>
                       <h5 className="font-bold text-green-600 text-xs uppercase tracking-wider mb-3 mt-4 flex justify-between">
                         Completed <span>{completedPlans.length}</span>
                       </h5>
                       <div className="space-y-3 opacity-75">
                         {completedPlans.map(plan => {
                           const subject = subjects.find(s => s.id === plan.subjectId);
                           const topic = topics.find(t => t.id === plan.topicId);
                           return (
                             <div key={plan.id} className="p-4 rounded-xl border border-green-100 bg-green-50/30 flex items-start gap-4">
                               <div className="mt-1.5 w-3 h-3 rounded-full flex-shrink-0 bg-green-500"></div>
                               <div>
                                   <p className="font-bold text-gray-700 text-base line-through">{topic?.name}</p>
                                   <p className="text-xs text-gray-500 font-medium mt-1">{subject?.name} • {plan.duration} mins</p>
                               </div>
                             </div>
                           )
                         })}
                       </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* COLUMN 2: TESTS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                 <h4 className="font-bold text-gray-800 text-lg">Tests</h4>
                 <div className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">{selectedDayTests.length} Total</div>
              </div>

              {selectedDayTests.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400">
                   <p className="text-sm">No tests scheduled for today.</p>
                </div>
              ) : (
                <>
                  {/* SCHEDULED (PENDING) TESTS */}
                  <div>
                     <h5 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-3 flex justify-between">
                       Scheduled <span>{pendingTests.length}</span>
                     </h5>
                     {pendingTests.length === 0 ? (
                       <p className="text-sm text-gray-400 italic pl-2">No pending tests.</p>
                     ) : (
                       <div className="space-y-3">
                         {pendingTests.map(test => {
                           const subject = subjects.find(s => s.id === test.subjectId);
                           return (
                             <div key={test.id} className="p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 bg-white hover:border-indigo-200 transition">
                               <div className="mt-1.5 w-3 h-3 rounded-full flex-shrink-0 bg-indigo-500"></div>
                               <div className="flex-1">
                                   <div className="flex justify-between items-start">
                                     <p className="font-bold text-gray-800 text-base">{test.title}</p>
                                     <div className="flex items-center gap-2">
                                       <button 
                                         onClick={() => handlePrintTest(test)} 
                                         className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                         title="Print Test Paper"
                                       >
                                         <Printer className="w-4 h-4"/>
                                       </button>
                                     </div>
                                   </div>
                                   <p className="text-xs text-gray-500 font-medium mt-1">{subject?.name} • {test.duration} mins</p>
                               </div>
                             </div>
                           )
                         })}
                       </div>
                     )}
                  </div>

                  {/* COMPLETED TESTS */}
                  {completedTests.length > 0 && (
                    <div>
                       <h5 className="font-bold text-green-600 text-xs uppercase tracking-wider mb-3 mt-4 flex justify-between">
                         Completed <span>{completedTests.length}</span>
                       </h5>
                       <div className="space-y-3 opacity-80">
                         {completedTests.map(test => {
                           const subject = subjects.find(s => s.id === test.subjectId);
                           return (
                             <div key={test.id} className="p-4 rounded-xl border border-green-100 bg-green-50/30 flex items-start gap-4">
                               <div className="mt-1.5 w-3 h-3 rounded-full flex-shrink-0 bg-green-500"></div>
                               <div className="flex-1">
                                   <div className="flex justify-between items-start">
                                     <p className="font-bold text-gray-700 text-base">{test.title}</p>
                                     <div className="flex items-center gap-2">
                                       <button onClick={() => handleViewReport(test)} className="p-1 text-gray-500 hover:text-indigo-600 rounded" title="View Report"><Eye className="w-4 h-4"/></button>
                                       <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{test.score}/{test.questions.length}</span>
                                     </div>
                                   </div>
                                   <p className="text-xs text-gray-500 font-medium mt-1">{subject?.name} • {test.duration} mins</p>
                               </div>
                             </div>
                           )
                         })}
                       </div>
                    </div>
                  )}
                </>
              )}
            </div>
         </div>
      </div>

      {/* 5. MODALS (Create Tasks) */}
      {modalMode !== 'none' && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in" 
          onClick={() => setModalMode('none')}
        >
           <div 
             className={`bg-white rounded-3xl w-full shadow-2xl p-6 max-h-[90vh] overflow-y-auto ${modalMode === 'report' ? 'max-w-3xl' : 'max-w-lg'}`}
             onClick={(e) => e.stopPropagation()}
           >
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-gray-900">
                   {modalMode === 'study' ? 'Add Study Assignment' : 
                    modalMode === 'test' ? 'Generate Test' : 
                    modalMode === 'report' ? 'Test Report' : ''}
                 </h3>
                 <button onClick={() => setModalMode('none')} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
              </div>

              {/* STUDY FORM */}
              {modalMode === 'study' && (
                <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                     <select className="w-full p-3 rounded-xl border border-gray-200 outline-none" value={studySubjectId} onChange={e => {setStudySubjectId(e.target.value); setStudyTopicId('');}}>
                       {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Topic</label>
                     <select className="w-full p-3 rounded-xl border border-gray-200 outline-none" value={studyTopicId} onChange={e => setStudyTopicId(e.target.value)}>
                       <option value="">Select Topic</option>
                       {topics.filter(t => t.subjectId === studySubjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Duration (mins)</label>
                       <select className="w-full p-3 rounded-xl border border-gray-200 outline-none" value={studyDuration} onChange={e => setStudyDuration(Number(e.target.value))}>
                         <option value={15}>15 mins</option><option value={30}>30 mins</option><option value={45}>45 mins</option><option value={60}>1 Hour</option>
                       </select>
                     </div>
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Notes for Student</label>
                      <textarea className="w-full p-3 rounded-xl border border-gray-200 outline-none resize-none h-24" value={studyNotes} onChange={e => setStudyNotes(e.target.value)} placeholder="e.g. Focus on the examples..."/>
                   </div>
                   <button onClick={handleAssignStudy} className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-200 mt-2">
                     Assign Task
                   </button>
                </div>
              )}

              {/* TEST FORM */}
              {modalMode === 'test' && (
                 <div className="space-y-4">
                    <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                     <select className="w-full p-3 rounded-xl border border-gray-200 outline-none" value={testSubjectId} onChange={e => {setTestSubjectId(e.target.value); setTestTopicId('');}}>
                       {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Topic</label>
                     <select className="w-full p-3 rounded-xl border border-gray-200 outline-none" value={testTopicId} onChange={e => setTestTopicId(e.target.value)}>
                       <option value="">Select Topic</option>
                       {topics.filter(t => t.subjectId === testSubjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                       <select className="w-full p-3 rounded-xl border border-gray-200 outline-none" value={testDifficulty} onChange={e => setTestDifficulty(e.target.value as DifficultyLevel)}>
                         <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option><option value="Mixed">Mixed</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1"># Questions</label>
                       <select className="w-full p-3 rounded-xl border border-gray-200 outline-none" value={testQuestionCount} onChange={e => setTestQuestionCount(Number(e.target.value))}>
                         <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                       </select>
                     </div>
                   </div>
                   <button 
                     onClick={handleAssignTest} 
                     disabled={isGenerating || !testTopicId}
                     className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 mt-2 flex justify-center items-center gap-2"
                   >
                     {isGenerating ? <Loader2 className="animate-spin w-4 h-4"/> : <BrainCircuit className="w-4 h-4"/>}
                     Generate AI Test
                   </button>
                 </div>
              )}

              {/* REPORT MODAL */}
              {modalMode === 'report' && selectedReportTest && (
                <div className="space-y-6">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{selectedReportTest.title}</h4>
                      <p className="text-gray-500 text-sm">Completed on {selectedReportTest.assignedDate}</p>
                    </div>
                    <div className="text-right">
                       <span className="block text-3xl font-display font-bold text-indigo-600">
                         {Math.round(((selectedReportTest.score || 0) / selectedReportTest.questions.length) * 100)}%
                       </span>
                       <span className="text-xs font-bold text-gray-400 uppercase">Final Score</span>
                    </div>
                  </div>

                  {/* Question Breakdown */}
                  <div className="space-y-6">
                     {selectedReportTest.questions.map((q, idx) => {
                       const studentAnswer = selectedReportTest.studentAnswers ? selectedReportTest.studentAnswers[idx] : -1;
                       const isCorrect = studentAnswer === q.correctAnswerIndex;
                       const isSkipped = studentAnswer === -1;

                       return (
                         <div key={idx} className={`p-5 rounded-2xl border ${isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                            <div className="flex gap-3 mb-3">
                              <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {idx + 1}
                              </span>
                              <h5 className="font-bold text-gray-800">{q.text}</h5>
                            </div>

                            <div className="space-y-2 pl-9">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = studentAnswer === optIdx;
                                const isActuallyCorrect = q.correctAnswerIndex === optIdx;
                                
                                let style = "border-gray-100 text-gray-500 bg-white";
                                if (isSelected && isCorrect) style = "border-green-500 bg-green-500 text-white font-bold";
                                else if (isSelected && !isCorrect) style = "border-red-500 bg-red-500 text-white font-bold";
                                else if (isActuallyCorrect && !isCorrect) style = "border-green-500 text-green-700 bg-green-50 font-bold border-2";

                                return (
                                  <div key={optIdx} className={`p-3 rounded-xl border text-sm flex justify-between items-center ${style}`}>
                                     <span>{opt}</span>
                                     {isSelected && isCorrect && <Check className="w-4 h-4"/>}
                                     {isSelected && !isCorrect && <X className="w-4 h-4"/>}
                                     {isActuallyCorrect && !isCorrect && <span className="text-xs uppercase font-bold">Correct Answer</span>}
                                  </div>
                                );
                              })}
                            </div>

                            {!isCorrect && q.explanation && (
                              <div className="mt-4 ml-9 bg-white p-3 rounded-xl border border-gray-200 text-sm text-gray-600 flex gap-2">
                                <Smile className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <span>{q.explanation}</span>
                              </div>
                            )}
                         </div>
                       );
                     })}
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

    </div>
  );
};
