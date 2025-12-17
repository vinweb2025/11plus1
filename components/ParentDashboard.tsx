
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateTestQuestions, generateRoadmapSuggestion } from '../services/geminiService';
import { 
  Calendar, BrainCircuit, CheckCircle, Loader2, ChevronLeft, ChevronRight, 
  Plus, X, BookOpen, Clock, Target, AlertCircle, BarChart3, TrendingUp,
  MoreHorizontal, Eye, Check, Smile, Search, Printer, Users, Lightbulb, Map,
  Timer, Zap, AlertTriangle, ShoppingBag, Trash2, Coins, Gift, Star, CheckSquare, Square, Layers, Lock, User,
  Settings, PenTool, History, Database
} from 'lucide-react';
import { UserRole, TestType, DifficultyLevel, TaskStatus, Test, Topic, SubTopic, Reward, Gender, PointCategory, PointRule, ScoreRange } from '../types';
import { ChildDashboard } from './ChildDashboard';
import { REWARD_ICONS, getRewardIcon, getIconComponent } from '../constants';

// Safe UUID Generator
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if context is not secure (http)
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
};

interface ParentDashboardProps {
  initialStudentId?: string | null;
  viewingAsId?: string;
}

export const ParentDashboard = ({ initialStudentId, viewingAsId }: ParentDashboardProps) => {
  const { 
    subjects, topics, users, addPlan, addTest, updateTest, deletePlan, deleteTest, plans, tests, currentUser, getUser, markPlanComplete, 
    rewards, addReward, deleteReward, updateReward,
    pointRules, updatePointRule, rewardRequests, approveRewardRequest, rejectRewardRequest, fulfillRewardRequest, pointTransactions, addManualPoints,
    aiGlobalBehavior, questionBank
  } = useApp();
  
  // --- ADMIN MODE: PARENT SELECTION ---
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const allParents = useMemo(() => users.filter(u => u.role === UserRole.PARENT), [users]);
  const [adminSelectedParentId, setAdminSelectedParentId] = useState<string>('');

  // Determine Effective Parent / Supervisor (Teacher)
  const effectiveParentId = viewingAsId || (isAdmin ? adminSelectedParentId : currentUser?.id);
  const effectiveParent = users.find(u => u.id === effectiveParentId) || (!isAdmin ? currentUser : null);

  // Security/Visibility Filter
  const myStudents = useMemo(() => {
    if (!effectiveParentId) return [];
    
    return users.filter(u => 
      u.role === UserRole.STUDENT && (
        (u.linkedUserIds?.includes(effectiveParentId)) || 
        (effectiveParent?.linkedUserIds?.includes(u.id))
      )
    );
  }, [users, effectiveParentId, effectiveParent]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modalMode, setModalMode] = useState<'none' | 'study' | 'test' | 'mock' | 'report' | 'rewards' | 'baseline'>('none');
  const [selectedReportTest, setSelectedReportTest] = useState<Test | null>(null);
  const [viewAsStudent, setViewAsStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  
  // Delete Confirmation State
  const [deleteItem, setDeleteItem] = useState<{ type: 'plan' | 'test', id: string, title: string } | null>(null);
  
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [viewingMistakes, setViewingMistakes] = useState(false);
  const [readingLessonTopicId, setReadingLessonTopicId] = useState<string | null>(null);

  // Rewards State
  const [rewardTab, setRewardTab] = useState<'catalog' | 'rules' | 'requests'>('catalog');
  const [rewardForm, setRewardForm] = useState<Partial<Reward>>({
    name: '', cost: 100, icon: 'Gift', color: 'bg-blue-500', type: 'real', approvalRequired: true
  });
  const [manualPointForm, setManualPointForm] = useState({ amount: 0, reason: '' });

  // Handle Initial Student Selection & Prop Updates
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  // Handle Default Selection if none selected
  useEffect(() => {
    if (!selectedStudentId && myStudents.length > 0) {
      if (!initialStudentId) {
         setSelectedStudentId(myStudents[0].id);
      } else {
         const exists = myStudents.find(s => s.id === initialStudentId);
         if (!exists && myStudents.length > 0) {
            setSelectedStudentId(myStudents[0].id);
         }
      }
    } else if (myStudents.length === 0) {
        setSelectedStudentId('');
    }
  }, [myStudents, selectedStudentId, initialStudentId]);

  // Identify Current Student & Status
  const selectedStudent = myStudents.find(s => s.id === selectedStudentId);
  const isInactive = selectedStudent ? !selectedStudent.active : false;

  // Study Plan State
  const [studySubjectId, setStudySubjectId] = useState('');
  const [studyTopicId, setStudyTopicId] = useState('');
  const [studySubTopicIds, setStudySubTopicIds] = useState<string[]>([]);
  const [studyDuration, setStudyDuration] = useState(30);
  const [studyNotes, setStudyNotes] = useState('');

  // Test Generation State
  const [testSubjectId, setTestSubjectId] = useState('');
  const [testTopicIds, setTestTopicIds] = useState<string[]>([]);
  const [testSubTopicIds, setTestSubTopicIds] = useState<string[]>([]);
  const [testDifficulty, setTestDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [testQuestionCount, setTestQuestionCount] = useState(10);
  const [testDuration, setTestDuration] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testSource, setTestSource] = useState<'AI' | 'BANK'>('AI');

  // Mock Exam State
  const [mockSubjectIds, setMockSubjectIds] = useState<string[]>([]);
  const [mockDifficulty, setMockDifficulty] = useState<DifficultyLevel>(DifficultyLevel.HARD);
  const [mockQuestionCount, setMockQuestionCount] = useState(50);

  // Baseline Test State
  const [baselineSubjectIds, setBaselineSubjectIds] = useState<string[]>([]);
  const [baselineDifficulty, setBaselineDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MIXED);
  const [baselineQuestionCount, setBaselineQuestionCount] = useState(50);
  const [baselineDuration, setBaselineDuration] = useState(60);

  // Initialize form defaults when subjects load
  useEffect(() => {
    if (subjects.length > 0) {
      if (!studySubjectId) setStudySubjectId(subjects[0].id);
      if (!testSubjectId) setTestSubjectId(subjects[0].id);
      if (baselineSubjectIds.length === 0) setBaselineSubjectIds(subjects.map(s => s.id)); // Default all subjects
    }
  }, [subjects]);

  const selectedStudentPlans = plans.filter(p => p.studentId === selectedStudentId);
  const selectedStudentTests = tests.filter(t => t.assignedTo === selectedStudentId);
  
  const selectedDayPlans = selectedStudentPlans.filter(p => p.date === selectedDate.toISOString().split('T')[0]);
  const selectedDayTests = selectedStudentTests.filter(t => t.assignedDate === selectedDate.toISOString().split('T')[0]);

  const pendingPlans = selectedDayPlans.filter(p => !p.completed);
  const completedPlans = selectedDayPlans.filter(p => p.completed);

  const pendingTests = selectedDayTests.filter(t => !t.completed);
  const completedTests = selectedDayTests.filter(t => t.completed);

  const availableRewards = useMemo(() => {
    return rewards.filter(r => !r.parentId || r.parentId === effectiveParentId);
  }, [rewards, effectiveParentId]);

  const availableTestTopics = topics.filter(t => t.subjectId === testSubjectId);
  
  const toggleTestTopic = (tId: string) => {
    setTestTopicIds(prev => 
      prev.includes(tId) ? prev.filter(id => id !== tId) : [...prev, tId]
    );
  };

  const toggleSelectAllTopics = () => {
    if (testTopicIds.length === availableTestTopics.length) {
      setTestTopicIds([]);
    } else {
      setTestTopicIds(availableTestTopics.map(t => t.id));
    }
  };

  const toggleMockSubject = (sId: string) => {
    setMockSubjectIds(prev => 
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const toggleBaselineSubject = (sId: string) => {
    setBaselineSubjectIds(prev => 
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

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
    setViewingMistakes(false);
    setModalMode('report');
  };

  const handleGenerateRoadmap = async () => {
    if (!selectedReportTest) return;
    setIsRoadmapLoading(true);

    const topicStats: Record<string, { correct: number; total: number }> = {};
    selectedReportTest.questions.forEach((q, idx) => {
      const topicName = q.topic || 'General';
      if (!topicStats[topicName]) topicStats[topicName] = { correct: 0, total: 0 };
      topicStats[topicName].total += 1;
      const studentAnswer = selectedReportTest.studentAnswers?.[idx] ?? -1;
      if (studentAnswer === q.correctAnswerIndex) topicStats[topicName].correct += 1;
    });

    const performanceData = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      score: Math.round((stats.correct / stats.total) * 100),
      total: stats.total
    }));

    const analysis = await generateRoadmapSuggestion(
      subjects.find(s => s.id === selectedReportTest.subjectId)?.name || 'Mixed Subjects',
      performanceData,
      aiGlobalBehavior
    );

    if (analysis) {
      updateTest({ ...selectedReportTest, analysis });
      setSelectedReportTest({ ...selectedReportTest, analysis });
    }
    setIsRoadmapLoading(false);
  };

  const handlePrintTest = (test: Test) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <html><head><title>${test.title}</title><style>
            body { font-family: sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .question { margin-bottom: 30px; page-break-inside: avoid; }
            .q-text { font-weight: bold; margin-bottom: 10px; font-size: 16px; }
            .options { margin-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .option { margin-bottom: 5px; display: flex; items-center; }
            .circle { display: inline-block; width: 16px; height: 16px; border: 2px solid #333; border-radius: 50%; margin-right: 10px; }
          </style></head><body>
          <div class="header"><h1>${test.title}</h1><p>Date: ${test.assignedDate} | Duration: ${test.duration} mins</p><br/><p>Student Name: __________________________ Score: ______ / ${test.questions.length}</p></div>
          ${test.questions.map((q, i) => `<div class="question"><div class="q-text">${i + 1}. ${q.text}</div><div class="options">${q.options.map(opt => `<div class="option"><span class="circle"></span>${opt}</div>`).join('')}</div></div>`).join('')}
          <script>window.onload = () => { window.print(); window.close(); }</script></body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleAssignStudy = async () => {
    if (!studySubjectId || !studyTopicId || !selectedStudentId) return;
    try {
      await addPlan({
        id: generateUUID(),
        parentId: effectiveParentId || 'unknown',
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
    } catch (e) {
      alert("Failed to assign study plan.");
    }
  };

  const handleAssignTest = async () => {
    if (!testSubjectId || !selectedStudentId || testTopicIds.length === 0) return;
    setIsGenerating(true);
    
    const subject = subjects.find(s => s.id === testSubjectId);
    const selectedTopics = topics.filter(t => testTopicIds.includes(t.id));
    const topicNames = selectedTopics.map(t => t.name);
    
    try {
      let questions: any[] = [];
      if (testSource === 'AI') {
         questions = await generateTestQuestions(subject?.name || '', topicNames, [], testDifficulty, testQuestionCount, false, aiGlobalBehavior);
      } else {
         const bankQuestions = questionBank.filter(q => (testTopicIds.includes(q.topicId)) && (testDifficulty === DifficultyLevel.MIXED || q.difficulty === testDifficulty));
         questions = bankQuestions.sort(() => 0.5 - Math.random()).slice(0, testQuestionCount);
         if (questions.length === 0) {
            alert("No questions found in Bank.");
            setIsGenerating(false);
            return;
         }
      }

      await addTest({
        id: generateUUID(),
        type: TestType.NORMAL,
        title: testTopicIds.length === 1 ? `${selectedTopics[0].name} Quiz` : `${subject?.name} Mixed Quiz`,
        subjectId: testSubjectId,
        topicIds: testTopicIds,
        questions: questions || [],
        createdBy: effectiveParentId || 'unknown',
        assignedTo: selectedStudentId,
        assignedDate: selectedDate.toISOString().split('T')[0],
        duration: testDuration,
        status: TaskStatus.NOT_STARTED,
        completed: false
      });
      setModalMode('none');
    } catch (e: any) {
      alert(`Failed to generate test: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssignMock = async () => {
    if (mockSubjectIds.length === 0 || !selectedStudentId) return;
    setIsGenerating(true);
    const subjectNames = subjects.filter(s => mockSubjectIds.includes(s.id)).map(s => s.name);
    try {
      const questions = await generateTestQuestions(subjectNames, null, [], mockDifficulty, mockQuestionCount, false, aiGlobalBehavior);
      await addTest({
        id: generateUUID(),
        type: TestType.MOCK,
        title: "Full Mock Exam",
        subjectId: mockSubjectIds[0],
        subjectIds: mockSubjectIds,
        questions: questions || [],
        createdBy: effectiveParentId || 'unknown',
        assignedTo: selectedStudentId,
        assignedDate: selectedDate.toISOString().split('T')[0],
        duration: 60,
        status: TaskStatus.NOT_STARTED,
        completed: false
      });
      setModalMode('none');
    } catch (e: any) {
      alert("Failed to create mock exam.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateBaseline = async () => {
    if (baselineSubjectIds.length === 0 || !selectedStudentId) return;
    setIsGenerating(true);
    const subjectNames = subjects.filter(s => baselineSubjectIds.includes(s.id)).map(s => s.name);
    try {
      const questions = await generateTestQuestions(subjectNames, null, [], baselineDifficulty, baselineQuestionCount, true, aiGlobalBehavior);
      await addTest({
        id: generateUUID(),
        type: TestType.BASELINE,
        title: `Comprehensive Baseline Assessment`,
        subjectId: baselineSubjectIds[0],
        subjectIds: baselineSubjectIds,
        questions: questions || [],
        createdBy: effectiveParentId || 'unknown',
        assignedTo: selectedStudentId,
        assignedDate: new Date().toISOString().split('T')[0],
        duration: baselineDuration,
        status: TaskStatus.NOT_STARTED,
        completed: false
      });
      setModalMode('none');
    } catch(e: any) {
      alert("Failed to assign baseline test.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateReward = async () => {
    if(!rewardForm.name || !rewardForm.cost) return;
    await addReward({
      id: `r-cust-${Date.now()}`,
      name: rewardForm.name,
      cost: Number(rewardForm.cost),
      icon: rewardForm.icon || 'Gift',
      color: rewardForm.color || 'bg-blue-500',
      type: 'real',
      description: rewardForm.description || 'Custom Reward',
      parentId: effectiveParentId,
      approvalRequired: rewardForm.approvalRequired,
      weeklyLimit: rewardForm.weeklyLimit
    });
    setRewardForm({ name: '', cost: 100, icon: 'Gift', color: 'bg-blue-500', type: 'real', approvalRequired: true });
  };

  const handleManualPoints = () => {
    if (selectedStudentId && manualPointForm.amount !== 0) {
      addManualPoints(selectedStudentId, manualPointForm.amount, manualPointForm.reason || 'Manual Adjustment');
      setManualPointForm({ amount: 0, reason: '' });
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="min-h-[3rem] bg-gray-50/30"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
      const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;
      const dayPlans = selectedStudentPlans.filter(p => p.date === dateStr);
      const dayTests = selectedStudentTests.filter(t => t.assignedDate === dateStr);
      const hasActivity = dayPlans.length > 0 || dayTests.length > 0;
      let statusClass = "bg-white border-gray-100 hover:border-blue-300";
      if (isSelected) statusClass = "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105 z-10";
      else if (hasActivity) {
        const allCompleted = [...dayPlans, ...dayTests].every(t => t.completed);
        if (allCompleted) statusClass = "bg-green-50 border-green-200";
        else statusClass = "bg-blue-50 border-blue-200";
      }
      days.push(
        <div key={day} onClick={() => handleDayClick(day)} className={`min-h-[3rem] md:min-h-[4rem] rounded-xl p-1 md:p-2 cursor-pointer transition-all flex flex-col justify-between border ${statusClass}`}>
          <span className={`font-bold text-xs md:text-sm ${isSelected ? 'text-white' : (hasActivity ? 'text-gray-800' : 'text-gray-400')}`}>{day}</span>
          <div className="flex gap-1 flex-wrap">
            {dayPlans.map((_, i) => <div key={`p-${i}`} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isSelected ? 'bg-orange-200' : 'bg-orange-400'}`}></div>)}
            {dayTests.map((_, i) => <div key={`t-${i}`} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isSelected ? 'bg-blue-200' : 'bg-blue-500'}`}></div>)}
          </div>
        </div>
      );
    }
    return days;
  };

  if (viewAsStudent) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col h-screen w-screen">
         <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md shrink-0">
             <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-full"><Eye className="w-5 h-5" /></div><div><span className="font-bold block text-lg">Viewing as {selectedStudent?.name}</span></div></div>
             <button onClick={() => setViewAsStudent(false)} className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-xl font-bold text-sm transition shadow-sm">Exit Student View</button>
         </div>
         <div className="flex-1 overflow-hidden"><div className="h-full overflow-y-auto p-4 md:p-8"><ChildDashboard previewStudentId={selectedStudentId} /></div></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
           <h2 className="text-3xl font-display font-bold text-gray-900">{viewingAsId ? "Student Overview" : "Parent Dashboard"}</h2>
           <p className="text-gray-500 mt-1">Manage progress for {selectedStudent?.name}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <button onClick={() => setModalMode('rewards')} className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-sm bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100">
            <ShoppingBag className="w-5 h-5"/> Manage Rewards
          </button>
          <button onClick={() => setViewAsStudent(true)} disabled={isInactive} className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50">
            <Eye className="w-5 h-5" /> View as Student
          </button>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-full sm:w-auto">
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold outline-none flex-1">
              {myStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" />{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex gap-1"><button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft className="w-5 h-5" /></button><button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight className="w-5 h-5" /></button></div>
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (<div key={d} className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide">{d}</div>))}</div>
              <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendarDays()}</div>
           </div>

           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col h-full min-h-[400px]">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-gray-800">Schedule for {selectedDate.toLocaleDateString()}</h3>
                 <div className="flex gap-2">
                    <button onClick={() => setModalMode('study')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-bold text-xs"><Plus className="w-3 h-3 inline mr-1"/> Study</button>
                    <button onClick={() => setModalMode('test')} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition font-bold text-xs"><Plus className="w-3 h-3 inline mr-1"/> Test</button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                 {pendingPlans.map(plan => (
                    <div key={plan.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm group">
                       <div className="p-2 rounded-lg bg-orange-100 text-orange-600"><BookOpen className="w-4 h-4"/></div>
                       <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm">{topics.find(t => t.id === plan.topicId)?.name || 'Study Session'}</h4>
                          <p className="text-xs text-gray-500">{plan.duration} mins</p>
                       </div>
                       <button onClick={() => deletePlan(plan.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                    </div>
                 ))}
                 {pendingTests.map(test => (
                    <div key={test.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm group">
                       <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><BrainCircuit className="w-4 h-4"/></div>
                       <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm">{test.title}</h4>
                          <p className="text-xs text-gray-500">{test.duration} mins</p>
                       </div>
                       <button onClick={() => deleteTest(test.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg">
                 <p className="text-xs font-bold uppercase opacity-80 mb-1">Average Score</p>
                 <div className="text-3xl font-display font-bold">
                    {completedTests.length > 0 ? Math.round(completedTests.reduce((acc, t) => acc + (t.score || 0)/t.questions.length, 0) / completedTests.length * 100) : 0}%
                 </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                 <p className="text-xs font-bold uppercase text-gray-400 mb-1">Available Coins</p>
                 <div className="text-3xl font-display font-bold text-gray-900">{selectedStudent?.coins || 0}</div>
              </div>
           </div>
           <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Advanced Actions</h4>
              <button onClick={() => setModalMode('mock')} className="w-full text-left p-3 rounded-xl bg-purple-50 text-purple-700 font-bold text-sm flex items-center gap-3"><Layers className="w-4 h-4"/> Assign Mock Exam</button>
              <button onClick={() => setModalMode('baseline')} className="w-full text-left p-3 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm flex items-center gap-3"><TrendingUp className="w-4 h-4"/> Assign Baseline Test</button>
           </div>
        </div>
      </div>

      {modalMode === 'rewards' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-yellow-600"/> Reward Management</h3>
                 <button onClick={() => setModalMode('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
              </div>
              <div className="flex border-b border-gray-100 px-6 bg-white shrink-0">
                 <button onClick={() => setRewardTab('catalog')} className={`py-4 text-sm font-bold border-b-2 px-4 ${rewardTab === 'catalog' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-400'}`}>Catalog</button>
                 <button onClick={() => setRewardTab('requests')} className={`py-4 text-sm font-bold border-b-2 px-4 ${rewardTab === 'requests' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400'}`}>Requests</button>
                 <button onClick={() => setRewardTab('rules')} className={`py-4 text-sm font-bold border-b-2 px-4 ${rewardTab === 'rules' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400'}`}>Rules</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                 {rewardTab === 'catalog' && (
                    <div className="space-y-6">
                       <div className="bg-white p-4 rounded-2xl border border-yellow-100 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <input className="p-2 border border-gray-200 rounded-xl text-sm" placeholder="Reward Name" value={rewardForm.name} onChange={e => setRewardForm({...rewardForm, name: e.target.value})} />
                          <input className="p-2 border border-gray-200 rounded-xl text-sm" type="number" placeholder="Cost" value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} />
                          <select className="p-2 border border-gray-200 rounded-xl text-sm" value={rewardForm.icon} onChange={e => setRewardForm({...rewardForm, icon: e.target.value})}>
                             {REWARD_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                          </select>
                          <button onClick={handleCreateReward} disabled={!rewardForm.name} className="bg-yellow-500 text-white font-bold rounded-xl text-sm hover:bg-yellow-600 transition">Add Reward</button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {availableRewards.map(r => (
                             <div key={r.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
                                <div className="flex justify-between items-start">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${r.color}`}>{getRewardIcon(r.icon)}</div>
                                   <p className="font-black text-yellow-600">{r.cost}</p>
                                </div>
                                <h4 className="font-bold text-gray-900 mt-2">{r.name}</h4>
                                <button onClick={() => deleteReward(r.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
                 {rewardTab === 'requests' && (
                    <div className="space-y-4">
                       {rewardRequests.filter(r => myStudents.some(s => s.id === r.studentId)).map(req => (
                          <div key={req.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                             <div>
                                <h4 className="font-bold text-gray-900">{req.rewardName}</h4>
                                <p className="text-xs text-gray-500 font-bold">{users.find(u => u.id === req.studentId)?.name}</p>
                             </div>
                             <div className="flex gap-2">
                                {req.status === 'PENDING' && (
                                   <>
                                      <button onClick={() => rejectRewardRequest(req.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs">Reject</button>
                                      <button onClick={() => approveRewardRequest(req.id)} className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs">Approve</button>
                                   </>
                                )}
                                {req.status === 'APPROVED' && <span className="text-green-600 font-bold">Approved</span>}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {modalMode === 'study' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden">
               <div className="p-6 border-b border-gray-100 flex justify-between bg-gray-50">
                  <h3 className="font-bold text-lg">Assign Study Task</h3>
                  <button onClick={() => setModalMode('none')}><X/></button>
               </div>
               <div className="p-6 space-y-4">
                  <select className="w-full p-3 border rounded-xl" value={studySubjectId} onChange={e => setStudySubjectId(e.target.value)}>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className="w-full p-3 border rounded-xl" value={studyTopicId} onChange={e => setStudyTopicId(e.target.value)}>
                     <option value="">Select Topic</option>
                     {topics.filter(t => t.subjectId === studySubjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input type="number" className="w-full p-3 border rounded-xl" value={studyDuration} onChange={e => setStudyDuration(Number(e.target.value))} />
                  <button onClick={handleAssignStudy} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Assign Plan</button>
               </div>
            </div>
         </div>
      )}

      {modalMode === 'test' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-6 border-b border-gray-100 flex justify-between bg-gray-50">
                  <h3 className="font-bold text-lg">Create Test</h3>
                  <button onClick={() => setModalMode('none')}><X/></button>
               </div>
               <div className="p-6 space-y-5 overflow-y-auto">
                  <select className="w-full p-3 border rounded-xl" value={testSubjectId} onChange={e => setTestSubjectId(e.target.value)}>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded-xl">
                     {availableTestTopics.map(t => (
                        <label key={t.id} className="flex items-center gap-2">
                           <input type="checkbox" checked={testTopicIds.includes(t.id)} onChange={() => toggleTestTopic(t.id)}/>
                           <span className="text-sm">{t.name}</span>
                        </label>
                     ))}
                  </div>
                  <button onClick={handleAssignTest} disabled={isGenerating} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl">
                     {isGenerating ? "Generating..." : "Generate & Assign"}
                  </button>
               </div>
            </div>
         </div>
      )}

      <div className="absolute bottom-4 text-center w-full text-xs font-bold text-blue-900/30">
         © 2024 11+ Yodha
      </div>
    </div>
  );
};
