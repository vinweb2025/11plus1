
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
  // If viewingAsId is provided (from TeacherDashboard), use it.
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

  const baselineTest = selectedStudentTests.find(t => t.type === TestType.BASELINE);

  const pendingPlans = selectedDayPlans.filter(p => !p.completed);
  const completedPlans = selectedDayPlans.filter(p => p.completed);

  const pendingTests = selectedDayTests.filter(t => !t.completed);
  const completedTests = selectedDayTests.filter(t => t.completed);

  // Toggle helpers for Test Topics
  const availableTestTopics = topics.filter(t => t.subjectId === testSubjectId);
  
  const toggleTestTopic = (tId: string) => {
    setTestTopicIds(prev => 
      prev.includes(tId) ? prev.filter(id => id !== tId) : [...prev, tId]
    );
    setTestSubTopicIds([]); 
  };

  const toggleSelectAllTopics = () => {
    if (testTopicIds.length === availableTestTopics.length) {
      setTestTopicIds([]);
    } else {
      setTestTopicIds(availableTestTopics.map(t => t.id));
    }
    setTestSubTopicIds([]);
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
    if (!studySubjectId) { alert("Please select a subject."); return; }
    if (!studyTopicId) { alert("Please select a topic."); return; }
    if (!selectedStudentId) { alert("Please select a student."); return; }

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
      console.error("Assign Study Error:", e);
      alert("Failed to assign study plan. Check console for details.");
    }
  };

  const handleAssignTest = async () => {
    if (!testSubjectId || !selectedStudentId || testTopicIds.length === 0) return;
    setIsGenerating(true);
    
    const subject = subjects.find(s => s.id === testSubjectId);
    const selectedTopics = topics.filter(t => testTopicIds.includes(t.id));
    const topicNames = selectedTopics.map(t => t.name);
    
    let subTopicNames: string[] = [];
    if (testTopicIds.length === 1 && testSubTopicIds.length > 0) {
       const topic = selectedTopics[0];
       subTopicNames = topic.subTopics.filter(st => testSubTopicIds.includes(st.id)).map(st => st.name);
    }

    try {
      let questions: any[] = [];

      if (testSource === 'AI') {
         questions = await generateTestQuestions(
            subject?.name || '',
            topicNames,
            subTopicNames,
            testDifficulty,
            testQuestionCount,
            false,
            aiGlobalBehavior
         );
      } else {
         // Question Bank Logic
         const bankQuestions = questionBank.filter(q => 
            (testTopicIds.includes(q.topicId)) && 
            (testDifficulty === DifficultyLevel.MIXED || q.difficulty === testDifficulty)
         );
         
         if (bankQuestions.length < testQuestionCount) {
            alert(`Only found ${bankQuestions.length} questions in Bank matching criteria. Using all of them.`);
            questions = bankQuestions;
         } else {
            // Random Shuffle
            questions = bankQuestions.sort(() => 0.5 - Math.random()).slice(0, testQuestionCount);
         }
         
         if (questions.length === 0) {
            alert("No questions found in Bank for these topics/difficulty.");
            setIsGenerating(false);
            return;
         }
      }

      let title = "";
      if (testTopicIds.length === 1) {
         title = `${selectedTopics[0].name} Quiz`;
      } else if (testTopicIds.length === availableTestTopics.length) {
         title = `${subject?.name} Full Assessment`;
      } else {
         title = `${subject?.name} Mixed Quiz`;
      }

      await addTest({
        id: generateUUID(),
        type: TestType.NORMAL,
        title: title,
        subjectId: testSubjectId,
        topicId: testTopicIds.length === 1 ? testTopicIds[0] : undefined,
        topicIds: testTopicIds,
        subTopicIds: testSubTopicIds,
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
      console.error("Assign Test Error:", e);
      alert(`Failed to generate test. Error: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssignMock = async () => {
    if (mockSubjectIds.length === 0) { alert("Please select at least one subject."); return; }
    if (!selectedStudentId) { alert("Please select a student."); return; }
    
    setIsGenerating(true);

    const selectedSubjects = subjects.filter(s => mockSubjectIds.includes(s.id));
    const subjectNames = selectedSubjects.map(s => s.name);

    try {
      const questions = await generateTestQuestions(
        subjectNames,
        null,
        [],
        mockDifficulty,
        mockQuestionCount,
        false,
        aiGlobalBehavior
      );

      await addTest({
        id: generateUUID(),
        type: TestType.MOCK,
        title: "Full Mock Exam",
        subjectId: mockSubjectIds[0], // Primary subject for reference
        subjectIds: mockSubjectIds,
        questions: questions || [],
        createdBy: effectiveParentId || 'unknown',
        assignedTo: selectedStudentId,
        assignedDate: selectedDate.toISOString().split('T')[0],
        duration: 60, // Standard 1 hour for mock
        status: TaskStatus.NOT_STARTED,
        completed: false
      });
      setModalMode('none');
    } catch (e: any) {
      console.error("Assign Mock Error:", e);
      alert(`Failed to create mock exam. Error: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateBaseline = async () => {
    if (baselineSubjectIds.length === 0) { alert("Please select subjects to cover."); return; }
    if (!selectedStudentId) { alert("Please select a student."); return; }
    
    setIsGenerating(true);
    
    const selectedSubjects = subjects.filter(s => baselineSubjectIds.includes(s.id));
    const subjectNames = selectedSubjects.map(s => s.name);

    try {
      const questions = await generateTestQuestions(
        subjectNames,
        null,
        [],
        baselineDifficulty,
        baselineQuestionCount,
        true, // isBaseline flag
        aiGlobalBehavior
      );
      
      await addTest({
        id: generateUUID(),
        type: TestType.BASELINE,
        title: `Comprehensive Baseline Assessment`,
        subjectId: baselineSubjectIds[0], // Primary for indexing
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
      console.error("Baseline Error:", e);
      alert(`Failed to assign baseline test. Error: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateReward = async () => {
    if(!rewardForm.name || !rewardForm.cost) return;
    try {
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
    } catch(e) {
        console.error("Failed to create reward", e);
    }
  };

  const handleManualPoints = () => {
    if (selectedStudentId && manualPointForm.amount !== 0) {
      addManualPoints(selectedStudentId, manualPointForm.amount, manualPointForm.reason || 'Manual Adjustment');
      setManualPointForm({ amount: 0, reason: '' });
    }
  };

  // --- RENDER HELPERS ---
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
        const someCompleted = [...dayPlans, ...dayTests].some(t => t.completed);
        const isPast = new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
        if (allCompleted) statusClass = "bg-green-50 border-green-200";
        else if (isPast && !allCompleted) statusClass = "bg-red-50 border-red-200";
        else if (someCompleted) statusClass = "bg-orange-50 border-orange-200";
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

  const LessonReaderOverlay = ({ topicName, subTopics, onClose }: { topicName: string, subTopics: SubTopic[], onClose: () => void }) => {
     return (
        <div className="fixed inset-0 z-[70] bg-gray-900/95 flex flex-col animate-in fade-in duration-300 backdrop-blur-sm">
           <div className="flex items-center justify-between p-6 text-white border-b border-white/10">
              <div className="flex items-center gap-4"><div className="bg-blue-600 p-2 rounded-lg"><BookOpen className="w-6 h-6"/></div><div><h3 className="font-bold text-lg">{topicName}</h3><p className="text-sm text-white/60">Quick Lesson Review</p></div></div>
              <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition"><X className="w-6 h-6"/></button>
           </div>
           <div className="flex-1 overflow-y-auto p-6 md:p-12"><div className="max-w-3xl mx-auto space-y-12">{subTopics.map((sub, idx) => (
              <div key={sub.id} className="bg-white rounded-3xl p-8 shadow-xl">
                 <h2 className="text-3xl font-display font-bold text-gray-900 mb-6 flex items-center gap-3"><span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm">{idx + 1}</span> {sub.name}</h2>
                 <div className="space-y-6">
                    <div className="text-lg leading-relaxed text-gray-700">{sub.explanation}</div>
                    <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-2xl relative"><h4 className="font-bold text-yellow-800 flex items-center gap-2 mb-2"><Target className="w-5 h-5"/> Learning Goal</h4><p className="text-yellow-900">{sub.learningObjective}</p></div>
                    <div className="bg-sky-50 border border-sky-100 p-6 rounded-2xl"><h4 className="font-bold text-sky-800 flex items-center gap-2 mb-4"><Lightbulb className="w-5 h-5"/> Examples</h4><div className="space-y-2">{sub.exampleQuestions.map((ex, i) => (<div key={i} className="bg-white p-3 rounded-lg text-gray-700 shadow-sm">{ex}</div>))}</div></div>
                 </div>
              </div>
           ))}</div></div>
        </div>
     )
  }

  if (viewAsStudent) {
    const studentName = myStudents.find(s => s.id === selectedStudentId)?.name || 'Student';
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col h-screen w-screen">
         <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md shrink-0">
             <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-full"><Eye className="w-5 h-5" /></div><div><span className="font-bold block text-lg">Viewing as {studentName}</span><span className="text-xs text-blue-200 uppercase tracking-wide font-bold">Preview Mode</span></div></div>
             <button onClick={() => setViewAsStudent(false)} className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-xl font-bold text-sm transition shadow-sm">Exit Student View</button>
         </div>
         <div className="flex-1 overflow-hidden"><div className="h-full overflow-y-auto p-4 md:p-8"><ChildDashboard previewStudentId={selectedStudentId} /></div></div>
      </div>
    )
  }
  
  if (myStudents.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
         {/* Admin Selector when empty - Hide if viewing as specific context (Teacher) */}
         {isAdmin && !viewingAsId && (
            <div className="w-full max-w-md mb-8 p-6 bg-white rounded-3xl shadow-xl border border-blue-100">
               <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Select Parent Account to View</label>
               <select 
                  value={adminSelectedParentId} 
                  onChange={(e) => setAdminSelectedParentId(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
               >
                  <option value="">-- Select a Parent --</option>
                  {allParents.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
               </select>
               <p className="text-xs text-blue-500 mt-2 font-medium">Select a parent to see their dashboard and students.</p>
            </div>
         )}

         <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center"><Users className="w-12 h-12 text-gray-400" /></div>
         <div className="max-w-md"><h2 className="text-2xl font-bold text-gray-800 mb-2">No Students Linked</h2>
         <p className="text-gray-500 mb-6">
            {isAdmin && !viewingAsId ? (adminSelectedParentId ? "The selected parent has no students linked." : "Please select a parent above.") : "You need to have students linked to your account to plan schedules and tests."}
         </p>
         {!isAdmin && !viewingAsId && <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700"><strong>Admin Tip:</strong> Ask admin to link your child's account.</div>}
         </div>
      </div>
    )
  }

  const isTeacher = currentUser?.role === UserRole.TEACHER;
  const dashboardTitle = isTeacher || viewingAsId ? "Student Overview" : "Parent Dashboard";
  const dashboardSubtitle = (isTeacher || viewingAsId) ? "Detailed progress and planning for " + (selectedStudent?.name || "") : "Plan, assign, and track progress.";

  return (
    <div className="space-y-8 pb-20">
      {readingLessonTopicId && (
         <LessonReaderOverlay 
           topicName={topics.find(t => t.id === readingLessonTopicId)?.name || 'Lesson'}
           subTopics={topics.find(t => t.id === readingLessonTopicId)?.subTopics || []}
           onClose={() => setReadingLessonTopicId(null)}
         />
      )}

      {/* Admin Impersonation Banner - Hide if viewingAsId is set (Teacher Context) */}
      {isAdmin && !viewingAsId && effectiveParent && (
         <div className="bg-gray-900 text-white p-3 rounded-xl flex items-center justify-between shadow-lg mb-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
               <div className="bg-white/20 p-1.5 rounded-lg"><User className="w-4 h-4 text-white"/></div>
               <span className="text-sm font-bold">Viewing as Parent: <span className="text-blue-300">{effectiveParent.name}</span></span>
            </div>
            <select 
               value={adminSelectedParentId}
               onChange={(e) => setAdminSelectedParentId(e.target.value)}
               className="bg-gray-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg border border-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
               {allParents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
         </div>
      )}

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
           <h2 className="text-3xl font-display font-bold text-gray-900">{dashboardTitle}</h2>
           <p className="text-gray-500 mt-1">{dashboardSubtitle}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setModalMode('rewards')} 
            className={`w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-sm bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100`}
          >
            <ShoppingBag className="w-5 h-5"/> Manage Rewards
          </button>
          
          <button 
            onClick={() => setViewAsStudent(true)} 
            disabled={isInactive}
            className={`w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-sm ${isInactive ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}
          >
            <Eye className="w-5 h-5" /> View as Student
          </button>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-full sm:w-auto">
            <label className="text-sm font-bold text-gray-500 pl-2 shrink-0">{isTeacher || viewingAsId ? 'Student:' : 'Child:'}</label>
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold outline-none flex-1">
              {myStudents.map(s => (
                <option key={s.id} value={s.id}>
                    {s.name} {s.gender ? `(${s.gender.charAt(0)})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* INACTIVE STUDENT BANNER */}
      {isInactive && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-bold text-lg">Student Account Inactive</h3>
              <p className="text-red-700 text-sm mt-1 leading-relaxed">
                {selectedStudent?.name}'s account has been deactivated. You can still view past history and reports, but you cannot assign new tasks, create tests, or manage rewards until the account is reactivated. 
                Please contact an Administrator for assistance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rest of the Dashboard (Calendar, Tasks, Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" />{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex gap-1"><button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft className="w-5 h-5" /></button><button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight className="w-5 h-5" /></button></div>
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (<div key={d} className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide">{d}</div>))}</div>
              <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendarDays()}</div>
           </div>

           {/* TASKS LIST */}
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col h-full min-h-[400px]">
              <div className="flex justify-between items-center mb-4">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800">Schedule for {selectedDate.toLocaleDateString()}</h3>
                    <p className="text-sm text-gray-500">{pendingPlans.length + pendingTests.length} Pending Tasks</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setModalMode('study')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-bold text-xs flex items-center gap-1"><Plus className="w-3 h-3"/> Study</button>
                    <button onClick={() => setModalMode('test')} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition font-bold text-xs flex items-center gap-1"><Plus className="w-3 h-3"/> Test</button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                 {/* Pending Items */}
                 {pendingPlans.map(plan => {
                    const subject = subjects.find(s => s.id === plan.subjectId);
                    const topic = topics.find(t => t.id === plan.topicId);
                    return (
                       <div key={plan.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm group hover:border-blue-200 transition">
                          <div className={`p-2 rounded-lg ${subject?.color || 'bg-gray-100'} text-white`}>{getIconComponent(subject?.icon || '')}</div>
                          <div className="flex-1">
                             <h4 className="font-bold text-gray-800 text-sm">{topic?.name}</h4>
                             <p className="text-xs text-gray-500 font-medium">Study • {plan.duration} mins</p>
                          </div>
                          <button 
                            onClick={(e) => { 
                               e.stopPropagation();
                               setDeleteItem({ type: 'plan', id: plan.id, title: topic?.name || 'Study Plan' });
                            }} 
                            className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                          >
                            <X className="w-4 h-4"/>
                          </button>
                       </div>
                    )
                 })}
                 {pendingTests.map(test => {
                    const subject = subjects.find(s => s.id === test.subjectId);
                    return (
                       <div key={test.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm group hover:border-blue-200 transition">
                          <div className={`p-2 rounded-lg ${test.type === TestType.MOCK ? 'bg-purple-100 text-purple-600' : (subject?.color || 'bg-gray-100')} ${test.type !== TestType.MOCK ? 'text-white' : ''}`}>
                             {test.type === TestType.MOCK ? <Layers className="w-4 h-4"/> : getIconComponent(subject?.icon || '')}
                          </div>
                          <div className="flex-1">
                             <h4 className="font-bold text-gray-800 text-sm">{test.title}</h4>
                             <p className="text-xs text-gray-500 font-medium">{test.type === TestType.MOCK ? 'Mock Exam' : 'Test'} • {test.duration} mins</p>
                          </div>
                          <button 
                            onClick={(e) => { 
                               e.stopPropagation();
                               setDeleteItem({ type: 'test', id: test.id, title: test.title });
                            }} 
                            className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                          >
                            <X className="w-4 h-4"/>
                          </button>
                       </div>
                    )
                 })}
                 
                 {/* Empty State */}
                 {pendingPlans.length === 0 && pendingTests.length === 0 && (
                    <div className="py-8 text-center text-gray-400">
                       <Smile className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                       <p className="text-sm">No tasks scheduled for this day.</p>
                    </div>
                 )}

                 {/* Completed Items Divider */}
                 {(completedPlans.length > 0 || completedTests.length > 0) && (
                    <div className="relative py-4">
                       <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                       <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400 font-bold uppercase tracking-wider">Completed</span></div>
                    </div>
                 )}
                 
                 {completedTests.map(test => (
                    <div key={test.id} onClick={() => handleViewReport(test)} className="flex items-center gap-3 p-3 rounded-xl border border-green-100 bg-green-50/30 opacity-80 hover:opacity-100 cursor-pointer transition">
                       <div className="p-2 rounded-lg bg-green-100 text-green-600"><CheckCircle className="w-4 h-4"/></div>
                       <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm decoration-gray-400">{test.title}</h4>
                          <p className="text-xs text-gray-500 font-medium">Score: {test.score}/{test.questions.length} ({Math.round((test.score || 0)/test.questions.length * 100)}%)</p>
                       </div>
                       <ChevronRight className="w-4 h-4 text-gray-400"/>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* RECENT ACTIVITY & STATS */}
        <div className="space-y-6">
           {/* Quick Stats */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-200">
                 <div className="flex items-center gap-2 mb-1 opacity-80"><Target className="w-4 h-4"/> <span className="text-xs font-bold uppercase tracking-wide">Avg Score</span></div>
                 <div className="text-3xl font-display font-bold">
                    {completedTests.length > 0 ? Math.round(completedTests.reduce((acc, t) => acc + (t.score || 0)/t.questions.length, 0) / completedTests.length * 100) : 0}%
                 </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                 <div className="flex items-center gap-2 mb-1 text-gray-400"><Star className="w-4 h-4 text-yellow-500"/> <span className="text-xs font-bold uppercase tracking-wide">Coins</span></div>
                 <div className="text-3xl font-display font-bold text-gray-900">{selectedStudent?.coins || 0}</div>
              </div>
           </div>

           {/* Quick Actions */}
           <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Quick Actions</h4>
              <button onClick={() => setModalMode('mock')} className="w-full text-left p-3 rounded-xl bg-purple-50 text-purple-700 font-bold text-sm flex items-center gap-3 hover:bg-purple-100 transition"><Layers className="w-4 h-4"/> Assign Mock Exam</button>
              <button onClick={() => setModalMode('baseline')} className="w-full text-left p-3 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm flex items-center gap-3 hover:bg-slate-100 transition"><TrendingUp className="w-4 h-4"/> Assign Baseline Test</button>
           </div>
        </div>
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 text-center space-y-4" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                 <Trash2 className="w-8 h-8"/>
              </div>
              <div>
                 <h3 className="text-xl font-bold text-gray-900">Delete Item?</h3>
                 <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to delete <span className="font-bold text-gray-800">{deleteItem.title}</span>?
                 </p>
              </div>
              <div className="flex gap-3 pt-2">
                 <button onClick={() => setDeleteItem(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Cancel</button>
                 <button onClick={() => {
                    if (deleteItem.type === 'plan') deletePlan(deleteItem.id);
                    else deleteTest(deleteItem.id);
                    setDeleteItem(null);
                 }} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition">Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODALS SECTION --- */}
      {/* ... [Existing Modals] ... */}
      {modalMode === 'report' && selectedReportTest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-xl text-gray-900">{selectedReportTest.title} Report</h3>
                 <button onClick={() => setModalMode('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 <div className="flex justify-center gap-12">
                    <div className="text-center">
                       <p className="text-xs font-bold text-gray-400 uppercase">Score</p>
                       <p className="text-4xl font-display font-bold text-blue-600">{selectedReportTest.score}/{selectedReportTest.questions.length}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-xs font-bold text-gray-400 uppercase">Percentage</p>
                       <p className={`text-4xl font-display font-bold ${((selectedReportTest.score || 0)/selectedReportTest.questions.length) >= 0.7 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round(((selectedReportTest.score || 0)/selectedReportTest.questions.length)*100)}%</p>
                    </div>
                 </div>
                 {selectedReportTest.analysis ? (
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
                       <div className="flex items-center gap-2 text-blue-800 font-bold mb-2">
                          <BrainCircuit className="w-5 h-5"/> AI Analysis
                       </div>
                       <p className="text-sm text-blue-900 leading-relaxed">{selectedReportTest.analysis.summary}</p>
                       <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="bg-white/60 p-3 rounded-xl">
                             <p className="text-xs font-bold text-green-700 uppercase mb-1">Strengths</p>
                             <ul className="text-sm text-green-900 space-y-1">{selectedReportTest.analysis.strengths.map(s => <li key={s}>• {s}</li>)}</ul>
                          </div>
                          <div className="bg-white/60 p-3 rounded-xl">
                             <p className="text-xs font-bold text-orange-700 uppercase mb-1">Focus Areas</p>
                             <ul className="text-sm text-orange-900 space-y-1">{selectedReportTest.analysis.weaknesses.map(w => <li key={w}>• {w}</li>)}</ul>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="text-center">
                       <button onClick={handleGenerateRoadmap} disabled={isRoadmapLoading} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto">
                          {isRoadmapLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <BrainCircuit className="w-4 h-4"/>} Generate AI Analysis
                       </button>
                    </div>
                 )}

                 <div className="border-t border-gray-100 pt-6">
                    <div className="flex gap-4 justify-center">
                       <button onClick={() => setViewingMistakes(!viewingMistakes)} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${viewingMistakes ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {viewingMistakes ? 'Hide Mistakes' : 'View Mistakes'}
                       </button>
                       <button onClick={() => handlePrintTest(selectedReportTest)} className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-2">
                          <Printer className="w-4 h-4"/> Print
                       </button>
                    </div>
                    
                    {viewingMistakes && (
                       <div className="mt-6 space-y-4">
                          {selectedReportTest.questions.map((q, i) => {
                             const studentAns = selectedReportTest.studentAnswers?.[i];
                             const isCorrect = studentAns === q.correctAnswerIndex;
                             if (isCorrect) return null;
                             return (
                                <div key={i} className="p-4 bg-red-50 rounded-xl border border-red-100 text-sm">
                                   <p className="font-bold text-gray-800 mb-2">{i+1}. {q.text}</p>
                                   <p className="text-red-600 mb-1"><span className="font-bold">Student Answer:</span> {q.options[studentAns || 0]}</p>
                                   <p className="text-green-700"><span className="font-bold">Correct Answer:</span> {q.options[q.correctAnswerIndex]}</p>
                                   {q.explanation && <p className="text-gray-600 mt-2 text-xs bg-white p-2 rounded border border-red-100">💡 {q.explanation}</p>}
                                </div>
                             )
                          })}
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- REWARDS MODAL --- */}
      {/* ... [Unchanged] ... */}

      {/* --- STUDY PLAN MODAL --- */}
      {modalMode === 'study' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-gray-100">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600"/> Assign Study Task</h3>
                  <button onClick={() => setModalMode('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                     <select className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={studySubjectId} onChange={e => {setStudySubjectId(e.target.value); setStudyTopicId('');}}>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Topic</label>
                     <select className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={studyTopicId} onChange={e => setStudyTopicId(e.target.value)}>
                        <option value="">Select Topic</option>
                        {topics.filter(t => t.subjectId === studySubjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Mins)</label>
                        <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={studyDuration} onChange={e => setStudyDuration(Number(e.target.value))} min={5} step={5}/>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes (Optional)</label>
                        <input type="text" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Read pages 10-12" value={studyNotes} onChange={e => setStudyNotes(e.target.value)}/>
                     </div>
                  </div>
                  <button onClick={handleAssignStudy} disabled={!studyTopicId} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition disabled:opacity-50 mt-2">
                     Assign Plan
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- TEST CREATION MODAL --- */}
      {modalMode === 'test' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-orange-600"/> Create Test</h3>
                  <button onClick={() => setModalMode('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Database className={`w-5 h-5 ${testSource === 'BANK' ? 'text-orange-600' : 'text-gray-400'}`}/>
                        <span className="text-sm font-bold text-gray-700">Question Source:</span>
                     </div>
                     <div className="flex bg-white rounded-lg p-1 border border-orange-200 shadow-sm">
                        <button onClick={() => setTestSource('AI')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${testSource === 'AI' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>AI Generator</button>
                        <button onClick={() => setTestSource('BANK')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${testSource === 'BANK' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Question Bank</button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                        <select className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={testSubjectId} onChange={e => {setTestSubjectId(e.target.value); setTestTopicIds([]);}}>
                           {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Difficulty</label>
                        <select className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={testDifficulty} onChange={e => setTestDifficulty(e.target.value as DifficultyLevel)}>
                           <option value={DifficultyLevel.EASY}>Easy</option>
                           <option value={DifficultyLevel.MEDIUM}>Medium</option>
                           <option value={DifficultyLevel.HARD}>Hard</option>
                           <option value={DifficultyLevel.MIXED}>Mixed</option>
                        </select>
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Select Topics</label>
                        <button onClick={toggleSelectAllTopics} className="text-xs font-bold text-blue-600 hover:underline">
                           {testTopicIds.length === availableTestTopics.length ? 'Deselect All' : 'Select All'}
                        </button>
                     </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                        {availableTestTopics.map(t => (
                           <label key={t.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition border ${testTopicIds.includes(t.id) ? 'bg-orange-50 border-orange-200' : 'hover:bg-white border-transparent'}`}>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${testTopicIds.includes(t.id) ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>
                                 {testTopicIds.includes(t.id) && <Check className="w-3 h-3 text-white"/>}
                              </div>
                              <input type="checkbox" className="hidden" checked={testTopicIds.includes(t.id)} onChange={() => toggleTestTopic(t.id)}/>
                              <span className={`text-xs font-bold ${testTopicIds.includes(t.id) ? 'text-orange-800' : 'text-gray-600'}`}>{t.name}</span>
                           </label>
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question Count</label>
                        <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={testQuestionCount} onChange={e => setTestQuestionCount(Number(e.target.value))} min={5} max={50}/>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Limit (Mins)</label>
                        <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={testDuration} onChange={e => setTestDuration(Number(e.target.value))} min={5}/>
                     </div>
                  </div>
               </div>
               <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                  <button onClick={handleAssignTest} disabled={isGenerating || testTopicIds.length === 0} className="w-full py-3.5 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
                     {isGenerating ? <Loader2 className="animate-spin w-5 h-5"/> : (testSource === 'AI' ? <BrainCircuit className="w-5 h-5"/> : <Database className="w-5 h-5"/>)}
                     {isGenerating ? (testSource === 'AI' ? 'Generating Questions...' : 'Fetching Questions...') : (testSource === 'AI' ? 'Generate & Assign Test' : 'Assign from Question Bank')}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- MOCK EXAM MODAL --- */}
      {/* ... [Existing Mock Modal Unchanged] ... */}
      {modalMode === 'mock' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-gray-100">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Layers className="w-5 h-5 text-purple-600"/> Create Mock Exam</h3>
                  <button onClick={() => setModalMode('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
               </div>
               <div className="p-6 space-y-5">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Included Subjects</label>
                     <div className="space-y-2">
                        {subjects.map(s => (
                           <div key={s.id} onClick={() => toggleMockSubject(s.id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition ${mockSubjectIds.includes(s.id) ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                              <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-lg ${s.color} text-white`}>{getIconComponent(s.icon)}</div>
                                 <span className="font-bold text-sm text-gray-800">{s.name}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mockSubjectIds.includes(s.id) ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>
                                 {mockSubjectIds.includes(s.id) && <Check className="w-3 h-3 text-white"/>}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Difficulty</label>
                        <select className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" value={mockDifficulty} onChange={e => setMockDifficulty(e.target.value as DifficultyLevel)}>
                           <option value={DifficultyLevel.MEDIUM}>Standard</option>
                           <option value={DifficultyLevel.HARD}>Challenge</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Questions</label>
                        <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" value={mockQuestionCount} onChange={e => setMockQuestionCount(Number(e.target.value))} min={20} max={100} step={10}/>
                     </div>
                  </div>

                  <button onClick={handleAssignMock} disabled={isGenerating || mockSubjectIds.length === 0} className="w-full py-3.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
                     {isGenerating ? <Loader2 className="animate-spin w-5 h-5"/> : <Layers className="w-5 h-5"/>}
                     {isGenerating ? 'Building Exam...' : 'Generate Mock Exam'}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- BASELINE TEST MODAL --- */}
      {/* ... [Existing Baseline Modal Unchanged] ... */}
      {modalMode === 'baseline' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-gray-100">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-slate-600"/> Create Baseline Test</h3>
                  <button onClick={() => setModalMode('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
               </div>
               <div className="p-6 space-y-5">
                  <p className="text-sm text-gray-500 mb-4">A comprehensive 50-question test to assess initial subject knowledge.</p>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subjects Covered</label>
                     <div className="space-y-2">
                        {subjects.map(s => (
                           <div key={s.id} onClick={() => toggleBaselineSubject(s.id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition ${baselineSubjectIds.includes(s.id) ? 'bg-slate-50 border-slate-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                              <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-lg ${s.color} text-white`}>{getIconComponent(s.icon)}</div>
                                 <span className="font-bold text-sm text-gray-800">{s.name}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${baselineSubjectIds.includes(s.id) ? 'bg-slate-600 border-slate-600' : 'bg-white border-gray-300'}`}>
                                 {baselineSubjectIds.includes(s.id) && <Check className="w-3 h-3 text-white"/>}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Difficulty</label>
                        <select className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 font-medium" value={baselineDifficulty} onChange={e => setBaselineDifficulty(e.target.value as DifficultyLevel)}>
                           <option value={DifficultyLevel.EASY}>Easy</option>
                           <option value={DifficultyLevel.MEDIUM}>Medium</option>
                           <option value={DifficultyLevel.HARD}>Hard</option>
                           <option value={DifficultyLevel.MIXED}>Mixed</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Questions</label>
                        <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 font-medium" value={baselineQuestionCount} onChange={e => setBaselineQuestionCount(Number(e.target.value))} min={10} max={100} step={10}/>
                     </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Limit (Minutes)</label>
                      <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 font-medium" value={baselineDuration} onChange={e => setBaselineDuration(Number(e.target.value))} min={10} max={180} step={5}/>
                  </div>

                  <button onClick={handleCreateBaseline} disabled={isGenerating || baselineSubjectIds.length === 0} className="w-full py-3.5 bg-slate-700 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
                     {isGenerating ? <Loader2 className="animate-spin w-5 h-5"/> : <TrendingUp className="w-5 h-5"/>}
                     {isGenerating ? 'Building Baseline...' : 'Generate Baseline Test'}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 text-center space-y-4" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                 <Trash2 className="w-8 h-8"/>
              </div>
              <div>
                 <h3 className="text-xl font-bold text-gray-900">Delete Item?</h3>
                 <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to delete <span className="font-bold text-gray-800">{deleteItem.title}</span>?
                 </p>
              </div>
              <div className="flex gap-3 pt-2">
                 <button onClick={() => setDeleteItem(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Cancel</button>
                 <button onClick={() => {
                    if (deleteItem.type === 'plan') deletePlan(deleteItem.id);
                    else deleteTest(deleteItem.id);
                    setDeleteItem(null);
                 }} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition">Delete</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
