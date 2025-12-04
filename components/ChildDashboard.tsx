
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Test, Topic, SubTopic, Subject, TestType, TaskStatus } from '../types';
import { getIconComponent } from '../constants';
import { 
  Check, Star, ArrowRight, Trophy, BookOpen, 
  ChevronLeft, ChevronRight, X, Lightbulb, Target, 
  HelpCircle, Library, PlayCircle, Bookmark, List,
  AlertCircle, Smile, StickyNote, Volume2, StopCircle, Clock
} from 'lucide-react';

// --- TYPES ---
interface BookState {
  isOpen: boolean;
  subjectId: string | null;
  currentTopicId: string | null;
  currentSubTopicId: string | null;
}

type ReadingSection = 'title' | 'explanation' | 'objective' | 'examples' | 'fact' | null;

interface ChildDashboardProps {
  previewStudentId?: string;
}

export const ChildDashboard = ({ previewStudentId }: ChildDashboardProps) => {
  const { currentUser, plans, tests, subjects, topics, completeTest, updatePlan, users } = useApp();
  
  // --- RESOLVE EFFECTIVE USER (Normal Mode vs Preview Mode) ---
  const effectiveUserId = previewStudentId || currentUser?.id;
  const effectiveUser = users.find(u => u.id === effectiveUserId) || currentUser;

  // --- SECURITY CHECK FOR PREVIEW MODE ---
  // Ensure that if a parent is previewing, they are actually linked to this child
  const isAuthorized = !previewStudentId || (currentUser?.linkedUserIds?.includes(previewStudentId));

  // --- STATE ---
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [bookState, setBookState] = useState<BookState>({
    isOpen: false,
    subjectId: null,
    currentTopicId: null,
    currentSubTopicId: null
  });

  // Test Taking State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Read Aloud State
  const [isReading, setIsReading] = useState(false);
  const [activeReadingSection, setActiveReadingSection] = useState<ReadingSection>(null);
  const isReadingRef = useRef(false);

  // Scroll Refs
  const titleRef = useRef<HTMLHeadingElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);
  const objectiveRef = useRef<HTMLDivElement>(null);
  const examplesRef = useRef<HTMLDivElement>(null);
  const factRef = useRef<HTMLDivElement>(null);

  // Derived Data (Using effectiveUserId)
  const myPlans = plans.filter(p => p.studentId === effectiveUserId && !p.completed);
  const myTests = tests.filter(t => t.assignedTo === effectiveUserId && !t.completed);
  const completedTests = tests.filter(t => t.assignedTo === effectiveUserId && t.completed);
  
  const baselineTest = myTests.find(t => t.type === TestType.BASELINE);

  // --- EFFECTS ---
  useEffect(() => {
    const stopSpeech = () => {
      if (window.speechSynthesis.speaking || isReading) {
        window.speechSynthesis.cancel();
        setIsReading(false);
        setActiveReadingSection(null);
        isReadingRef.current = false;
      }
    };
    stopSpeech();
    return () => { stopSpeech(); };
  }, [bookState.currentSubTopicId, bookState.isOpen]);

  // --- READER LOGIC ---
  const openBook = (subjectId: string) => { switchSubject(subjectId); };

  const switchSubject = (subjectId: string) => {
    const subjectTopics = topics.filter(t => t.subjectId === subjectId).sort((a, b) => a.order - b.order);
    const firstTopic = subjectTopics[0];
    const firstSubTopic = firstTopic?.subTopics[0];

    setBookState({
      isOpen: true,
      subjectId,
      currentTopicId: firstTopic?.id || null,
      currentSubTopicId: firstSubTopic?.id || null
    });
  };

  const closeBook = () => { setBookState({ ...bookState, isOpen: false }); };

  const navigateToSubTopic = (topicId: string, subTopicId: string) => {
    setBookState(prev => ({ ...prev, currentTopicId: topicId, currentSubTopicId: subTopicId }));
  };

  const navigateNext = () => {
    if (!bookState.subjectId || !bookState.currentTopicId || !bookState.currentSubTopicId) return;
    const subjectTopics = topics.filter(t => t.subjectId === bookState.subjectId).sort((a, b) => a.order - b.order);
    const currentTopicIdx = subjectTopics.findIndex(t => t.id === bookState.currentTopicId);
    if (currentTopicIdx === -1) return;

    const currentTopic = subjectTopics[currentTopicIdx];
    const currentSubIdx = currentTopic.subTopics.findIndex(st => st.id === bookState.currentSubTopicId);

    if (currentSubIdx < currentTopic.subTopics.length - 1) {
      navigateToSubTopic(currentTopic.id, currentTopic.subTopics[currentSubIdx + 1].id);
      return;
    }
    if (currentTopicIdx < subjectTopics.length - 1) {
      const nextTopic = subjectTopics[currentTopicIdx + 1];
      if (nextTopic.subTopics.length > 0) {
        navigateToSubTopic(nextTopic.id, nextTopic.subTopics[0].id);
      }
    }
  };

  const navigatePrev = () => {
    if (!bookState.subjectId || !bookState.currentTopicId || !bookState.currentSubTopicId) return;
    const subjectTopics = topics.filter(t => t.subjectId === bookState.subjectId).sort((a, b) => a.order - b.order);
    const currentTopicIdx = subjectTopics.findIndex(t => t.id === bookState.currentTopicId);
    if (currentTopicIdx === -1) return;

    const currentTopic = subjectTopics[currentTopicIdx];
    const currentSubIdx = currentTopic.subTopics.findIndex(st => st.id === bookState.currentSubTopicId);

    if (currentSubIdx > 0) {
      navigateToSubTopic(currentTopic.id, currentTopic.subTopics[currentSubIdx - 1].id);
      return;
    }
    if (currentTopicIdx > 0) {
      const prevTopic = subjectTopics[currentTopicIdx - 1];
      if (prevTopic.subTopics.length > 0) {
        navigateToSubTopic(prevTopic.id, prevTopic.subTopics[prevTopic.subTopics.length - 1].id);
      }
    }
  };

  const scrollToRef = (ref: React.RefObject<HTMLElement>) => {
    if (ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const speakChunk = (text: string, section: ReadingSection, ref: React.RefObject<HTMLElement>): Promise<void> => {
    return new Promise((resolve) => {
      if (!isReadingRef.current) { resolve(); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === 'en-GB' || v.name.includes('UK') || v.name.includes('British')) || voices[0];
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onstart = () => { if (isReadingRef.current) { setActiveReadingSection(section); scrollToRef(ref); } };
      utterance.onend = () => { resolve(); };
      utterance.onerror = () => { resolve(); };
      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleReadAloud = async () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      setActiveReadingSection(null);
      isReadingRef.current = false;
      return;
    }

    const activeTopic = topics.find(t => t.id === bookState.currentTopicId);
    const activeSubTopic = activeTopic?.subTopics.find(st => st.id === bookState.currentSubTopicId);

    if (!activeSubTopic) return;

    setIsReading(true);
    isReadingRef.current = true;

    await speakChunk(activeSubTopic.name, 'title', titleRef);
    if (isReadingRef.current) await speakChunk(`Here is what this means. ${activeSubTopic.explanation}`, 'explanation', explanationRef);
    if (isReadingRef.current) await speakChunk(`Your goal is to: ${activeSubTopic.learningObjective}`, 'objective', objectiveRef);
    if (isReadingRef.current && activeSubTopic.exampleQuestions.length > 0) {
       await speakChunk("Let's look at some examples.", 'examples', examplesRef);
       for (const q of activeSubTopic.exampleQuestions) {
         if (isReadingRef.current) await speakChunk(q, 'examples', examplesRef);
       }
    }
    if (isReadingRef.current) {
       const factText = activeTopic?.tags.includes('Grammar School') 
        ? "Did you know? This topic appears frequently in Grammar School entrance exams! Mastering it gives you a big advantage." 
        : "Did you know? Regular practice of this skill strengthens your brain's problem-solving pathways!";
       await speakChunk(factText, 'fact', factRef);
    }

    setIsReading(false);
    setActiveReadingSection(null);
    isReadingRef.current = false;
  };

  const getHighlightClass = (section: ReadingSection) => {
    if (activeReadingSection === section) return "ring-4 ring-yellow-300 bg-yellow-50/50 scale-[1.02] transition-all duration-500 rounded-xl";
    return "transition-all duration-500";
  };

  // --- TEST LOGIC ---
  const startTest = (test: Test) => {
    setActiveTest(test);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(test.questions.length).fill(-1));
    setShowResults(false);
  };

  const handleAnswer = (optionIndex: number) => {
    // Only allow answering if not yet answered
    if (answers[currentQuestionIndex] !== -1) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (activeTest && currentQuestionIndex < activeTest.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    if (!activeTest) return;
    let score = 0;
    activeTest.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswerIndex) score++;
    });
    // Pass the full answers array so it can be reviewed later
    completeTest(activeTest.id, score, answers);
    setShowResults(true);
  };

  const closeTest = () => {
    setActiveTest(null);
    setShowResults(false);
  };

  const markPlanComplete = (planId: string) => {
     const plan = plans.find(p => p.id === planId);
     if (plan) {
       updatePlan({ ...plan, completed: true, status: TaskStatus.COMPLETED });
     }
  };

  // --- UNAUTHORIZED STATE ---
  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-gray-50 text-center">
         <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
           <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
           <p className="text-gray-500">You do not have permission to view this student's dashboard.</p>
         </div>
      </div>
    );
  }

  // --- RENDERERS ---

  // 1. MAGIC BOOK READER
  if (bookState.isOpen && bookState.subjectId) {
     const subject = subjects.find(s => s.id === bookState.subjectId);
     const subjectTopics = topics.filter(t => t.subjectId === bookState.subjectId).sort((a, b) => a.order - b.order);
     const activeTopic = topics.find(t => t.id === bookState.currentTopicId);
     const activeSubTopic = activeTopic?.subTopics.find(st => st.id === bookState.currentSubTopicId);
     
     // Progress Calc
     const allSubTopics: { tId: string, sId: string }[] = [];
     subjectTopics.forEach(t => t.subTopics.forEach(st => allSubTopics.push({ tId: t.id, sId: st.id })));
     const currentIndex = allSubTopics.findIndex(item => item.sId === bookState.currentSubTopicId);
     const progressPercent = allSubTopics.length > 0 ? Math.round(((currentIndex + 1) / allSubTopics.length) * 100) : 0;

     return (
       <div 
         className="fixed inset-0 bg-gray-900/95 z-50 flex flex-col backdrop-blur-md animate-in fade-in duration-300 font-display" 
         onClick={closeBook}
       >
         <div 
           className="h-20 px-8 flex justify-between items-center text-white shrink-0" 
           onClick={(e) => e.stopPropagation()}
         >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20"><BookOpen className="w-6 h-6" /></div>
              <div><h1 className="text-xl font-bold">My Library</h1><p className="text-white/60 text-sm">Select a book to read</p></div>
            </div>
            <button onClick={closeBook} className="p-3 hover:bg-white/20 rounded-full transition bg-white/10"><X className="w-6 h-6" /></button>
         </div>
         <div className="flex-1 flex overflow-hidden px-4 md:px-8 pb-8 gap-6 md:gap-12">
            <div 
              className="w-20 md:w-28 flex flex-col gap-4 py-4 overflow-y-auto shrink-0 no-scrollbar items-center" 
              onClick={(e) => e.stopPropagation()}
            >
                {subjects.filter(s => s.active).map(sub => (
                    <button key={sub.id} onClick={() => switchSubject(sub.id)} className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all w-full ${bookState.subjectId === sub.id ? 'bg-white text-indigo-900 shadow-xl scale-105 z-10' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:scale-105'}`}>
                        <div className={`p-3 rounded-xl shadow-inner transition-transform duration-300 ${bookState.subjectId === sub.id ? sub.color + ' text-white scale-110' : 'bg-gray-700/50'}`}>{getIconComponent(sub.icon)}</div>
                        <span className={`text-[10px] md:text-xs font-bold text-center leading-tight ${bookState.subjectId === sub.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{sub.name}</span>
                        {bookState.subjectId === sub.id && <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-1.5 h-8 bg-indigo-400 rounded-l-full"></div>}
                    </button>
                ))}
            </div>
            <div className="flex-1 h-full relative flex justify-center items-center py-2 md:py-6">
                <div 
                  className="w-full max-w-7xl h-full bg-[#fdfbf7] rounded-[2rem] md:rounded-[3rem] shadow-2xl relative flex overflow-hidden border-4 md:border-8 border-[#f0e6d2]" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="absolute left-[30%] top-0 bottom-0 w-16 -ml-8 bg-gradient-to-r from-transparent via-black/5 to-transparent z-20 pointer-events-none hidden md:block"></div>
                  <div className="absolute left-[30%] top-0 bottom-0 w-[1px] bg-gray-300 z-20 hidden md:block"></div>
                  
                  {/* Left Page */}
                  <div className="hidden md:flex flex-col w-[30%] h-full bg-[#fdfbf7] border-r border-gray-200 p-6 overflow-y-auto custom-scrollbar relative">
                     <div className="mb-6 sticky top-0 bg-[#fdfbf7] z-10 pb-4 border-b border-gray-100">
                       <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-3"><span className={`p-1.5 rounded-lg ${subject?.color} text-white`}>{getIconComponent(subject?.icon || 'Book')}</span>{subject?.name}</h2>
                       <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div></div>
                       <div className="flex justify-between items-center mt-2"><p className="text-[10px] text-gray-400 font-sans font-bold uppercase tracking-wide">Progress</p><p className="text-xs font-bold text-green-600">{progressPercent}%</p></div>
                     </div>
                     <div className="space-y-6 pb-10">
                       {subjectTopics.map((topic, tIdx) => (
                         <div key={topic.id} className="relative group">
                           <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-100 group-last:hidden"></div>
                           <div className="flex items-center gap-3 mb-3">
                             <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 border-2 border-[#fdfbf7] transition-colors ${topic.id === bookState.currentTopicId ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-110' : 'bg-gray-200 text-gray-500'}`}>{tIdx + 1}</div>
                             <h3 className={`font-bold text-sm leading-tight transition-colors ${topic.id === bookState.currentTopicId ? 'text-indigo-900' : 'text-gray-400'}`}>{topic.name}</h3>
                           </div>
                           <div className="ml-9 space-y-1">
                             {topic.subTopics.map((sub) => {
                               const isActive = sub.id === bookState.currentSubTopicId;
                               return <button key={sub.id} onClick={() => navigateToSubTopic(topic.id, sub.id)} className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between ${isActive ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm' : 'hover:bg-gray-50 text-gray-500 border border-transparent'}`}><span className={`text-sm font-sans truncate ${isActive ? 'font-bold' : 'font-medium'}`}>{sub.name}</span>{isActive && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}</button>
                             })}
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>

                  {/* Right Page (Content) */}
                  <div className="w-full md:w-[70%] h-full bg-[#fdfbf7] p-8 md:p-16 md:pt-12 overflow-y-auto flex flex-col relative custom-scrollbar scroll-smooth">
                    <div className="md:hidden mb-6 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-[#fdfbf7] z-20">
                       <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-500 truncate">{activeTopic?.name}</span>
                       <div className="flex items-center gap-2">
                         <button onClick={navigatePrev} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm"><ChevronLeft className="w-5 h-5"/></button>
                         <button onClick={navigateNext} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm"><ChevronRight className="w-5 h-5"/></button>
                       </div>
                    </div>
                    {activeSubTopic ? (
                        <div className="flex-1 max-w-3xl mx-auto w-full animate-in slide-in-from-right-4 duration-500">
                           <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex-1">
                              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-full text-xs font-bold uppercase tracking-wider mb-4 shadow-sm"><Star className="w-3 h-3 fill-orange-500 text-orange-500" />{activeTopic?.name}</div>
                              <h2 ref={titleRef} className={`text-4xl md:text-5xl font-bold text-gray-900 leading-[1.15] mb-6 p-2 rounded-xl ${getHighlightClass('title')}`}>{activeSubTopic.name}</h2>
                              <div className="h-1.5 w-24 bg-indigo-500 rounded-full"></div>
                            </div>
                            <button onClick={toggleReadAloud} className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-sm transition-all border ${isReading ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-white text-indigo-600 border-gray-100 hover:border-indigo-100 hover:bg-indigo-50'}`}>{isReading ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}{isReading ? 'Stop' : 'Read Aloud'}</button>
                          </div>
                          <div className="space-y-10 font-sans">
                            <div ref={explanationRef} className={`text-xl text-gray-700 leading-loose font-medium p-4 -ml-4 ${getHighlightClass('explanation')}`}>{activeSubTopic.explanation}</div>
                            <div ref={objectiveRef} className={`transform rotate-1 hover:rotate-0 transition-transform duration-300 origin-center ${getHighlightClass('objective')}`}>
                              <div className="bg-[#fff9c4] p-8 shadow-lg shadow-yellow-100/50 relative border border-yellow-200/50">
                                 <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 backdrop-blur-sm -rotate-1 border-l border-r border-white/50"></div>
                                 <h4 className="font-display font-bold text-yellow-800 text-xl mb-3 flex items-center gap-2"><Target className="w-6 h-6" /> Learning Goal</h4>
                                 <p className="text-yellow-900 font-medium text-lg leading-relaxed">{activeSubTopic.learningObjective}</p>
                              </div>
                            </div>
                            <div ref={examplesRef} className={`bg-sky-50 rounded-[2rem] p-8 md:p-10 border border-sky-100 relative overflow-hidden group ${getHighlightClass('examples')}`}>
                               <div className="absolute -top-20 -right-20 w-64 h-64 bg-sky-100 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                               <h4 className="font-display font-bold text-sky-800 text-2xl mb-6 flex items-center gap-3 relative z-10"><div className="bg-sky-200 p-2 rounded-xl text-sky-700"><Lightbulb className="w-6 h-6" /> </div>Let's Practice!</h4>
                               <div className="space-y-4 relative z-10">{activeSubTopic.exampleQuestions.map((q, idx) => (<div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100 flex gap-4 items-start hover:shadow-md transition"><span className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold text-sm">{idx + 1}</span><p className="text-gray-700 font-medium pt-1 text-lg">{q}</p></div>))}</div>
                            </div>
                          </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-10"><BookOpen className="w-16 h-16 text-gray-200 mb-4" /><h3 className="text-2xl font-bold text-gray-600 mb-2">Ready to Learn?</h3><p className="text-lg">Select a topic from the left to start reading!</p></div>
                    )}
                    {activeSubTopic && (
                       <div className="mt-20 pt-8 border-t border-gray-200 hidden md:flex items-center justify-between">
                           <button onClick={navigatePrev} disabled={currentIndex === 0} className="flex items-center gap-3 text-gray-500 hover:text-indigo-600 transition font-bold disabled:opacity-30"><div className="p-3 bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5"/></div><span>Previous</span></button>
                           <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Page {currentIndex + 1} of {allSubTopics.length}</span>
                           <button onClick={navigateNext} disabled={currentIndex === allSubTopics.length - 1} className="flex items-center gap-3 text-gray-500 hover:text-indigo-600 transition font-bold disabled:opacity-30"><span>Next</span><div className="p-3 bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5"/></div></button>
                       </div>
                    )}
                  </div>
                </div>
            </div>
         </div>
       </div>
     );
  }

  // 2. TEST TAKER RENDERER
  if (activeTest) {
    if (showResults) {
      const score = answers.reduce((acc, curr, idx) => acc + (curr === activeTest.questions[idx].correctAnswerIndex ? 1 : 0), 0);
      const percentage = Math.round((score / activeTest.questions.length) * 100);
      return (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center space-y-6 mt-10 animate-in zoom-in-95 duration-300">
          <Trophy className={`w-24 h-24 mx-auto ${percentage > 70 ? 'text-yellow-400' : 'text-gray-300'}`} />
          <h2 className="text-4xl font-display font-bold text-kid-primary">{percentage > 70 ? 'Amazing Job!' : 'Good Effort!'}</h2>
          <p className="text-2xl text-gray-600">You scored {score} out of {activeTest.questions.length}</p>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden"><div className="bg-kid-primary h-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div></div>
          <button onClick={closeTest} className="bg-kid-primary text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-indigo-600 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5">Back to Dashboard</button>
        </div>
      );
    }
    const question = activeTest.questions[currentQuestionIndex];
    const userAnswer = answers[currentQuestionIndex];
    const isAnswered = userAnswer !== -1;
    const isCorrect = isAnswered && userAnswer === question.correctAnswerIndex;

    return (
      <div className="max-w-3xl mx-auto space-y-6 mt-8">
        <div className="flex justify-between items-center text-gray-500 font-medium">
          <span className="bg-white px-3 py-1 rounded-full shadow-sm text-sm">Question {currentQuestionIndex + 1} of {activeTest.questions.length}</span>
          <span className="font-bold text-gray-700">{activeTest.title}</span>
        </div>
        
        {/* Question Card */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border-b-8 border-kid-primary/10">
          <h3 className="text-2xl font-medium text-gray-800 mb-8 leading-relaxed">{question.text}</h3>
          
          <div className="space-y-4">
            {question.options.map((option, idx) => {
              // Determine style based on state
              let btnClass = "border-gray-200 hover:border-kid-primary/50 hover:bg-gray-50 text-gray-800"; // Default
              if (isAnswered) {
                if (idx === question.correctAnswerIndex) {
                  btnClass = "bg-green-500 border-green-500 text-white font-bold shadow-md"; // Correct Answer (Always show)
                } else if (idx === userAnswer && !isCorrect) {
                  btnClass = "bg-red-500 border-red-500 text-white font-bold shadow-md"; // User Selected Wrong
                } else {
                  btnClass = "border-gray-100 text-gray-400 opacity-60"; // Others
                }
              }

              return (
                <button 
                  key={idx} 
                  onClick={() => handleAnswer(idx)} 
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${btnClass}`}
                >
                  <span className="text-lg">{option}</span>
                  {isAnswered && idx === question.correctAnswerIndex && <div className="bg-white text-green-600 rounded-full p-1"><Check className="w-4 h-4" /></div>}
                  {isAnswered && idx === userAnswer && !isCorrect && <div className="bg-white text-red-600 rounded-full p-1"><X className="w-4 h-4" /></div>}
                </button>
              );
            })}
          </div>

          {/* Explanation Box (Visible after answer) */}
          {isAnswered && (
             <div className={`mt-8 p-6 rounded-2xl border-l-4 animate-in fade-in slide-in-from-top-2 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                <h4 className={`font-bold text-lg mb-2 flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? <><Smile className="w-5 h-5"/> Correct!</> : <><AlertCircle className="w-5 h-5"/> Not quite right.</>}
                </h4>
                <p className="text-gray-700">{question.explanation || "No explanation provided."}</p>
             </div>
          )}

          <div className="mt-8 flex justify-end">
            <button 
              onClick={nextQuestion} 
              disabled={!isAnswered} 
              className="bg-kid-accent text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-orange-200"
            >
              {currentQuestionIndex === activeTest.questions.length - 1 ? 'Finish Test' : 'Next Question'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. DASHBOARD RENDERER (Uses effectiveUser)
  return (
    <div className="space-y-10 pb-20">
      
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-display font-bold text-gray-800 tracking-tight">Hi, {effectiveUser?.name}! 👋</h2>
          <p className="text-gray-500 text-lg mt-1">Ready to explore your library today?</p>
        </div>
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 text-yellow-800 px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-sm">
           <div className="bg-white p-2 rounded-full shadow-sm"><Trophy className="w-5 h-5 text-yellow-500" /></div>
           <div className="flex flex-col"><span className="text-xs uppercase tracking-wide text-yellow-600">Total Score</span><span className="text-xl leading-none">{completedTests.reduce((acc, t) => acc + (t.score || 0), 0) * 10} XP</span></div>
        </div>
      </header>

      {/* BASELINE TEST ALERT */}
      {baselineTest && !baselineTest.completed && (
        <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200 group cursor-pointer" onClick={() => startTest(baselineTest)}>
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition duration-700"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
             <div>
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-3">Important Task</div>
               <h3 className="text-2xl font-bold mb-2">First Step: Baseline Assessment</h3>
               <p className="text-indigo-100 max-w-xl">Take this 45-minute test to help us create the perfect study plan for you. It covers Maths, English, and Reasoning.</p>
             </div>
             <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-lg flex items-center gap-2">Start Baseline Test <ArrowRight className="w-5 h-5"/></button>
           </div>
        </div>
      )}

      {/* Library Section */}
      <section>
        <div className="flex items-center gap-3 mb-6"><Library className="w-6 h-6 text-indigo-600" /><h3 className="text-2xl font-display font-bold text-gray-800">My Library</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subjects.filter(s => s.active).map(subject => (
            <div key={subject.id} onClick={() => openBook(subject.id)} className="group relative bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col h-64">
              <div className={`h-2/3 ${subject.color} p-6 flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                <div className="text-white transform group-hover:scale-110 transition duration-300">{getIconComponent(subject.icon)}</div>
              </div>
              <div className="flex-1 p-4 flex flex-col justify-center text-center"><h4 className="font-bold text-gray-800 text-lg group-hover:text-indigo-600 transition">{subject.name}</h4><p className="text-xs text-gray-500 mt-1">{topics.filter(t => t.subjectId === subject.id).length} Chapters</p></div>
              <div className="absolute bottom-4 right-4 bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"><PlayCircle className="w-5 h-5 text-indigo-600" /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Assignments */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2"><Check className="w-6 h-6 text-green-600" /><h3 className="text-xl font-display font-bold text-gray-700">To Do List</h3></div>
          {myTests.length === 0 && myPlans.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400"><Star className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>You're all caught up! Great job!</p></div>
          ) : (
            <div className="space-y-4">
              {myTests.map(test => {
                if (test.type === TestType.BASELINE) return null; // Handled separately
                const subject = subjects.find(s => s.id === test.subjectId);
                return (
                  <div key={test.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-indigo-500 flex items-center justify-between hover:shadow-md transition">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${subject?.color || 'bg-gray-400'} text-white shadow-sm`}>{getIconComponent(subject?.icon || '')}</div>
                      <div><span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Test ({test.duration}m)</span><h4 className="font-bold text-gray-800">{test.title}</h4></div>
                    </div>
                    <button onClick={() => startTest(test)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-100 transition">Start</button>
                  </div>
                );
              })}
              {myPlans.map(plan => {
                 const topic = topics.find(t => t.id === plan.topicId);
                 const subject = subjects.find(s => s.id === plan.subjectId);
                 return (
                   <div key={plan.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-orange-400 flex flex-col gap-3 group">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${subject?.color || 'bg-gray-400'} text-white shadow-sm`}>{getIconComponent(subject?.icon || '')}</div>
                          <div><span className="text-xs font-bold text-orange-500 uppercase tracking-wide">Study ({plan.duration}m)</span><h4 className="font-bold text-gray-800">{topic?.name}</h4></div>
                        </div>
                        <button onClick={() => markPlanComplete(plan.id)} className="p-2 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-full transition"><Check className="w-6 h-6"/></button>
                     </div>
                     {plan.notes && <div className="ml-14 bg-gray-50 p-3 rounded-xl text-sm text-gray-600 flex gap-2"><StickyNote className="w-4 h-4 text-gray-400 shrink-0 mt-0.5"/> {plan.notes}</div>}
                   </div>
                 );
               })}
            </div>
          )}
        </section>

        {/* Progress / History */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2"><Trophy className="w-6 h-6 text-yellow-500" /><h3 className="text-xl font-display font-bold text-gray-700">Recent Achievements</h3></div>
          {completedTests.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400">Complete tests to see your achievements here!</div>
          ) : (
            <div className="grid gap-4">
              {completedTests.slice(0, 3).map(test => (
                   <div key={test.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between opacity-80 hover:opacity-100 transition">
                     <div><h4 className="font-bold text-gray-700">{test.title}</h4><p className="text-xs text-gray-400">{test.assignedDate}</p></div>
                     <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full font-bold text-sm"><Star className="w-4 h-4 fill-yellow-500" />{test.score}/{test.questions.length}</div>
                   </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
