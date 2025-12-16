
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Test, Topic, SubTopic, Subject, TestType, TaskStatus, TopicStatus, UserRole, PointCategory, Reward, Question } from '../types';
import { getIconComponent, getRewardIcon, INITIAL_REWARDS } from '../constants';
import { getAiClient } from '../services/geminiService';
import { 
  Check, Star, ArrowRight, ArrowLeft, Trophy, BookOpen, 
  ChevronLeft, ChevronRight, X, Lightbulb, Target, 
  Library, PlayCircle, List,
  AlertCircle, Smile, StickyNote, Volume2, StopCircle, Map, Lock, Zap,
  ShoppingBag, Coins, Gift, Monitor, Pizza, Bot, Rocket, Ticket, IceCream, Menu,
  Clock, Calendar, TrendingUp, History, Activity, AlertTriangle, FileText, Eye, Play, CheckCircle, Layers, User, BrainCircuit, Store, Mic, MicOff, RefreshCw, MessageCircle, Send
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

// --- MISTAKE TUTOR COMPONENT ---
const MistakeTutor = ({ question, studentAnswer, correctOption, subjectName, onClose }: { question: Question, studentAnswer: string, correctOption: string, subjectName: string, onClose: () => void }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<'explain' | 'verify' | 'practice' | 'success'>('explain');
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);

  const { aiGlobalBehavior } = useApp();

  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Chat
  useEffect(() => {
    const initChat = async () => {
      const ai = getAiClient();
      if (!ai) return;

      const systemPrompt = `
        ${aiGlobalBehavior}

        Your specific goal now is to help a student (aged 10-11) understand why they got a specific question wrong.
        
        Question: "${question.text}"
        Topic: ${question.topic || subjectName}
        Student's Wrong Answer: "${studentAnswer}"
        Correct Answer: "${correctOption}"
        Explanation Context: "${question.explanation || ''}"

        Phase 1 (Explanation): Explain simply why the answer is wrong and the correct concept. Be concise. Ask if they understand.
        Phase 2 (Verification): If the student says they understand, ask them to explain the concept back to you in their own words.
        Phase 3 (Practice): If their explanation is correct, say "CORRECT_UNDERSTANDING" (hidden trigger). If not, clarify again.
      `;

      try {
        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction: systemPrompt }
        });
        chatRef.current = chat;

        setIsLoading(true);
        const result = await chat.sendMessage({ message: "Start the session by explaining the mistake." });
        setMessages([{ role: 'model', text: result.text || "Hello! Let's look at this question together." }]);
        speak(result.text || "Hello! Let's look at this question together.");
      } catch (e) {
        console.error("Chat Init Error:", e);
        setMessages([{ role: 'model', text: "I'm having trouble connecting to my brain right now. You can still read the explanation!" }]);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-GB';
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInput(text);
        handleSend(text);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [question, aiGlobalBehavior]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const generatePracticeQuestions = async () => {
    setPhase('practice');
    setIsLoading(true);
    const ai = getAiClient();
    if (!ai) return;

    const prompt = `
      ${aiGlobalBehavior}
      The student has understood the concept for: "${question.text}".
      Generate 3 similar multiple-choice questions to test this specific concept.
      Target Audience: 11+ student.
      Return strictly valid JSON array of objects with properties: text, options (array of 4 strings), correctAnswerIndex (0-3), explanation.
    `;

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      if (result.text) {
        const qs = JSON.parse(result.text);
        setPracticeQuestions(qs);
      }
    } catch (e) {
      console.error("Practice Gen Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !chatRef.current) return;

    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessage({ message: text });
      const responseText = result.text || "";

      if (responseText.includes("CORRECT_UNDERSTANDING")) {
        const cleanText = responseText.replace("CORRECT_UNDERSTANDING", "").trim() || "That's spot on! Now, let's try a few practice questions to make sure you've mastered it.";
        setMessages([...newMessages, { role: 'model' as const, text: cleanText }]);
        speak(cleanText);
        setTimeout(generatePracticeQuestions, 2000);
      } else {
        setMessages([...newMessages, { role: 'model' as const, text: responseText }]);
        speak(responseText);
      }
    } catch (e) {
      console.error("Send Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeAnswer = (idx: number) => {
    const currentQ = practiceQuestions[practiceIndex];
    const isCorrect = idx === currentQ.correctAnswerIndex;
    
    if (isCorrect) setPracticeScore(s => s + 1);
    setPracticeFeedback(isCorrect ? "Correct! 🎉" : `Oops! The correct answer was ${String.fromCharCode(65 + currentQ.correctAnswerIndex)}.`);

    setTimeout(() => {
      setPracticeFeedback(null);
      if (practiceIndex < practiceQuestions.length - 1) {
        setPracticeIndex(i => i + 1);
      } else {
        setPhase('success');
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><BrainCircuit className="w-6 h-6"/></div>
            <div>
              <h3 className="font-display font-bold text-xl">Mistake Tutor</h3>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">{subjectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-6 h-6"/></button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Context Panel */}
          <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto hidden md:block">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Original Question</h4>
             <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
                <p className="font-bold text-slate-800 text-lg mb-4">{question.text}</p>
                <div className="space-y-2">
                   {question.options.map((opt, i) => (
                      <div key={i} className={`p-2 rounded-lg text-sm border ${question.correctAnswerIndex === i ? 'bg-green-50 border-green-200 text-green-800 font-bold' : opt === studentAnswer ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                         {String.fromCharCode(65+i)}. {opt} {question.correctAnswerIndex === i ? '✅' : opt === studentAnswer ? '❌' : ''}
                      </div>
                   ))}
                </div>
             </div>
             
             {phase === 'success' && (
                <div className="bg-green-100 p-6 rounded-3xl text-center animate-in zoom-in">
                   <Trophy className="w-12 h-12 text-green-600 mx-auto mb-2"/>
                   <h3 className="font-black text-green-800 text-xl">Awesome!</h3>
                   <p className="text-green-700 font-medium text-sm">You mastered this concept!</p>
                   <p className="mt-2 text-2xl font-black text-green-900">{practiceScore}/{practiceQuestions.length}</p>
                </div>
             )}
          </div>

          {/* Right: Interaction Area */}
          <div className="flex-1 flex flex-col bg-white relative">
             {phase === 'practice' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in slide-in-from-right">
                   <div className="max-w-lg w-full">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Practice Question {practiceIndex + 1}/{practiceQuestions.length}</span>
                         <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">Score: {practiceScore}</span>
                      </div>
                      
                      <h3 className="text-2xl font-display font-bold text-slate-900 mb-8">{practiceQuestions[practiceIndex].text}</h3>
                      
                      {practiceFeedback ? (
                         <div className={`p-6 rounded-2xl text-xl font-bold animate-in zoom-in ${practiceFeedback.includes('Correct') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {practiceFeedback}
                         </div>
                      ) : (
                         <div className="grid gap-4">
                            {practiceQuestions[practiceIndex].options.map((opt, i) => (
                               <button 
                                 key={i} 
                                 onClick={() => handlePracticeAnswer(i)}
                                 className="p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 font-bold text-slate-700 transition text-left"
                               >
                                  {opt}
                               </button>
                            ))}
                         </div>
                      )}
                   </div>
                </div>
             ) : (
                <>
                   {/* Chat History */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((m, i) => (
                         <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                               {m.text}
                            </div>
                         </div>
                      ))}
                      <div ref={messagesEndRef} />
                   </div>

                   {/* Input Area */}
                   <div className="p-4 border-t border-slate-100 bg-slate-50">
                      {phase === 'success' ? (
                         <button onClick={onClose} className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg hover:bg-green-700 transition">Finish Session</button>
                      ) : (
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={toggleListening} 
                              className={`p-4 rounded-2xl transition-all shadow-md ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                            >
                               {isListening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                            </button>
                            <input 
                              className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700" 
                              placeholder="Type your answer or ask a question..."
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                              disabled={isLoading}
                            />
                            <button 
                              onClick={() => handleSend()} 
                              disabled={isLoading || !input.trim()}
                              className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-md"
                           >
                               {isLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                            </button>
                         </div>
                      )}
                   </div>
                </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChildDashboard = ({ previewStudentId }: ChildDashboardProps) => {
  const { currentUser, plans, tests, subjects, topics, completeTest, markPlanComplete, users, redeemReward, rewards, calculatePoints, rewardRequests, requestReward, pointTransactions } = useApp();
  
  // --- ADMIN SIMULATION STATE ---
  const [adminSelectedStudentId, setAdminSelectedStudentId] = useState<string>('');

  // --- RESOLVE EFFECTIVE USER ---
  let effectiveUserId = previewStudentId || currentUser?.id;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  if (isAdmin && !previewStudentId) {
     if (adminSelectedStudentId) effectiveUserId = adminSelectedStudentId;
     else effectiveUserId = undefined; 
  }

  const effectiveUser = users.find(u => u.id === effectiveUserId) || (!isAdmin ? currentUser : null);
  const isAuthorized = isAdmin || !previewStudentId || (currentUser?.linkedUserIds?.includes(previewStudentId));

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'roadmap' | 'library' | 'todo' | 'rewards' | 'mocks' | 'mistakes'>('roadmap');
  const [roadmapSubjectId, setRoadmapSubjectId] = useState(subjects[0]?.id || '');
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  
  // Mistake Module State
  const [mistakeTestId, setMistakeTestId] = useState<string | null>(null);
  const [activeMistakeQuestion, setActiveMistakeQuestion] = useState<{question: Question, studentAnswer: string, correctOption: string, subjectName: string} | null>(null);

  // Reward Tab State
  const [rewardView, setRewardView] = useState<'store' | 'history'>('store');

  // Modals
  const [historyModalTopicId, setHistoryModalTopicId] = useState<string | null>(null);
  const [reportTestId, setReportTestId] = useState<string | null>(null);

  // Book Reader State
  const [bookState, setBookState] = useState<BookState>({
    isOpen: false,
    subjectId: null,
    currentTopicId: null,
    currentSubTopicId: null
  });
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);

  // Test Taking State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [pointBreakdown, setPointBreakdown] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Read Aloud State
  const [isReading, setIsReading] = useState(false);
  const [activeReadingSection, setActiveReadingSection] = useState<ReadingSection>(null);
  const isReadingRef = useRef(false);

  // Refs
  const titleRef = useRef<HTMLHeadingElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);
  const objectiveRef = useRef<HTMLDivElement>(null);
  const examplesRef = useRef<HTMLDivElement>(null);
  const factRef = useRef<HTMLDivElement>(null);

  // Derived Data
  const myPlans = plans.filter(p => p.studentId === effectiveUserId && !p.completed);
  const myTests = tests.filter(t => t.assignedTo === effectiveUserId && !t.completed);
  const completedTests = tests.filter(t => t.assignedTo === effectiveUserId && t.completed);
  const mockTests = tests.filter(t => t.assignedTo === effectiveUserId && t.type === TestType.MOCK);
  const myRequests = rewardRequests.filter(r => r.studentId === effectiveUserId && r.status === 'PENDING');
  
  // Find tests with mistakes
  const testsWithMistakes = completedTests.filter(t => t.score !== undefined && t.score < t.questions.length);

  const baselineTest = tests.find(t => t.assignedTo === effectiveUserId && t.type === TestType.BASELINE);
  const isBaselineComplete = baselineTest?.completed;
  const pendingCount = myPlans.length + myTests.length;

  const studentParents = users.filter(u => u.role === UserRole.PARENT && u.linkedUserIds?.includes(effectiveUserId || ''));
  const parentIds = studentParents.map(p => p.id);
  const availableRewards = rewards.filter(r => !r.parentId || parentIds.includes(r.parentId || ''));

  // Ensure roadmapSubjectId is valid when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !roadmapSubjectId) {
        setRoadmapSubjectId(subjects[0].id);
    }
  }, [subjects, roadmapSubjectId]);

  // Calculate Reward Stats
  const myTransactions = pointTransactions.filter(t => t.studentId === effectiveUserId);
  const totalEarned = myTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const totalSpent = Math.abs(myTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0));
  
  const rewardHistory = [
     // Approved Requests
     ...rewardRequests.filter(r => r.studentId === effectiveUserId && (r.status === 'APPROVED' || r.status === 'FULFILLED')).map(r => ({
        id: r.id,
        name: r.rewardName,
        icon: r.rewardIcon,
        cost: r.cost,
        date: r.actionDate || r.requestDate,
        type: 'APPROVED'
     })),
     // Direct Purchases (Redemptions that might not be in requests if instant)
     ...myTransactions.filter(t => t.amount < 0 && !rewardRequests.some(r => r.studentId === effectiveUserId && r.cost === Math.abs(t.amount) && Math.abs(new Date(r.actionDate || r.requestDate).getTime() - new Date(t.date).getTime()) < 5000)).map(t => ({
        id: t.id,
        name: t.description.replace('Redeemed ', '').replace('Approved: ', ''),
        icon: 'Gift',
        cost: Math.abs(t.amount),
        date: t.date,
        type: 'INSTANT'
     }))
  ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  // ... (Topic Metrics logic omitted for brevity, unchanged) ...
  const getTopicMetrics = (topic: Topic) => {
    let baselineScore = 0;
    let baselineTotal = 0;
    let hasBaselineData = false;

    if (baselineTest && baselineTest.completed && baselineTest.studentAnswers) {
      baselineTest.questions.forEach((q, idx) => {
        if (q.topic && q.topic.toLowerCase().includes(topic.name.toLowerCase())) {
           baselineTotal++;
           if (baselineTest.studentAnswers && baselineTest.studentAnswers[idx] === q.correctAnswerIndex) {
             baselineScore++;
           }
        }
      });
      if (baselineTotal > 0) hasBaselineData = true;
    }

    const baselinePercentage = baselineTotal > 0 ? Math.round((baselineScore / baselineTotal) * 100) : 0;

    const relevantTests = completedTests.filter(t => 
      t.type === TestType.NORMAL && 
      (t.topicId === topic.id || t.topicIds?.includes(topic.id))
    );

    let currentScore = 0;
    let currentTotal = 0;
    let totalQuestionsAttempted = 0;
    
    if (relevantTests.length > 0) {
       relevantTests.forEach(t => {
         if (t.score !== undefined) {
           currentScore += t.score;
           currentTotal += t.questions.length;
           totalQuestionsAttempted += t.questions.length;
         }
       });
    }

    const currentPercentage = currentTotal > 0 ? Math.round((currentScore / currentTotal) * 100) : (hasBaselineData ? baselinePercentage : 0);
    const improvement = currentPercentage - baselinePercentage;

    let status = TopicStatus.LOCKED;
    const subjectTopics = topics.filter(t => t.subjectId === topic.subjectId).sort((a, b) => a.order - b.order);
    const myIndex = subjectTopics.findIndex(t => t.id === topic.id);
    const prevTopic = myIndex > 0 ? subjectTopics[myIndex - 1] : null;

    if (!isBaselineComplete) {
      status = TopicStatus.LOCKED; 
    } else if (myIndex === 0) {
      status = TopicStatus.READY;
    } else if (prevTopic) {
      const prevHasActivity = completedTests.some(t => t.topicId === prevTopic.id || t.topicIds?.includes(prevTopic.id));
      if (prevHasActivity || (baselineTest?.completed)) {
        status = TopicStatus.READY; 
      }
    }

    if (currentTotal > 0 || hasBaselineData) status = TopicStatus.IN_PROGRESS;
    if (currentPercentage >= 80 && currentTotal > 0) status = TopicStatus.MASTERED;

    return { baselinePercentage, currentPercentage, improvement, hasBaselineData, attempts: relevantTests.length, totalQuestionsAttempted, status, relevantTests };
  };

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

  useEffect(() => {
    let timer: any;
    if (activeTest && !showResults && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0; 
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTest, showResults, timeRemaining]);

  const openBook = (subjectId: string) => { 
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
    setIsMobileTocOpen(false); 
  };

  const startTest = (test: Test) => {
    setActiveTest(test);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(test.questions.length).fill(-1));
    setShowResults(false);
    setStartTime(Date.now());
    setTimeRemaining(test.duration * 60);
  };

  const handleAnswer = (optionIndex: number) => {
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
    const timeTaken = Math.floor((Date.now() - startTime) / 1000); 
    let score = 0;
    activeTest.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswerIndex) score++;
    });
    
    // NEW: USE RULES ENGINE
    const percentage = Math.round((score / activeTest.questions.length) * 100);
    const category = activeTest.type === TestType.MOCK ? PointCategory.MOCK_TEST : PointCategory.PRACTICE_TEST;
    const result = calculatePoints(category, percentage);
    
    setEarnedCoins(result.points);
    setPointBreakdown(result.breakdown);

    completeTest(activeTest.id, score, answers, timeTaken);
    setShowResults(true);
  };

  const closeTest = () => {
    setActiveTest(null);
    setShowResults(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRequestReward = (reward: Reward) => {
    if (previewStudentId) { alert("You are in preview mode."); return; }
    if (isAdmin) { alert("Admin cannot request rewards."); return; }
    requestReward(reward, effectiveUserId || '');
  };

  // ... (Rest of component methods unchanged) ...

  const getSubjectTheme = (id: string) => {
    const subj = subjects.find(s => s.id === id);
    const name = subj?.name || '';
    if (name.includes('Math')) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', primary: 'bg-blue-600', shadow: 'shadow-blue-200', gradient: 'from-blue-600 to-cyan-500', progress: 'bg-blue-500', btn: 'bg-blue-600' };
    if (name.includes('English')) return { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', primary: 'bg-sky-600', shadow: 'shadow-sky-200', gradient: 'from-sky-600 to-blue-500', progress: 'bg-sky-500', btn: 'bg-sky-600' };
    if (name.includes('Verbal')) return { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', primary: 'bg-cyan-600', shadow: 'shadow-cyan-200', gradient: 'from-cyan-600 to-teal-500', progress: 'bg-cyan-500', btn: 'bg-cyan-600' };
    return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', primary: 'bg-orange-600', shadow: 'shadow-orange-200', gradient: 'from-orange-600 to-yellow-500', progress: 'bg-orange-500', btn: 'bg-orange-600' };
  };

  const theme = getSubjectTheme(roadmapSubjectId);

  // Helper to get subjects for a test
  const getTestSubjects = (test: Test) => {
    const ids = test.subjectIds || (test.subjectId ? [test.subjectId] : []);
    return subjects.filter(s => ids.includes(s.id));
  };

  if (!isAuthorized) return <div className="flex h-screen items-center justify-center p-8 bg-gray-50 text-center"><div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100"><AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2></div></div>;

  if (isAdmin && !effectiveUserId) {
     const students = users.filter(u => u.role === UserRole.STUDENT);
     return (
        <div className="flex h-screen items-center justify-center p-8 bg-gray-50/50">
           <div className="w-full max-w-md p-8 bg-white rounded-[2.5rem] shadow-2xl border border-orange-100 text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500"><User className="w-10 h-10"/></div>
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Admin Student View</h2>
              <div className="relative"><select value={adminSelectedStudentId} onChange={(e) => setAdminSelectedStudentId(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl font-bold text-gray-800 outline-none focus:border-orange-500 focus:bg-white transition-all appearance-none"><option value="">-- Select Student --</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} {s.gender ? `(${s.gender.charAt(0)})` : ''}</option>)}</select></div>
           </div>
        </div>
     )
  }

  // --- RENDER HELPERS ---
  const renderActiveTest = () => {
    if (!activeTest) return null;

    if (showResults) {
       return (
         <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="max-w-lg w-full text-center space-y-6">
                <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-bounce shadow-xl shadow-green-200"><Trophy className="w-16 h-16 text-green-600"/></div>
                <div><h2 className="text-4xl font-display font-black text-gray-900 mb-2">Great Job!</h2><p className="text-gray-500 text-lg font-medium">You completed {activeTest.title}</p></div>
                
                {/* Updated Points Feedback */}
                <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-3xl transform rotate-1">
                   <p className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-1">Total Earned</p>
                   <div className="flex items-center justify-center gap-2 text-5xl font-display font-black text-orange-500"><Coins className="w-10 h-10 fill-orange-500"/> +{earnedCoins}</div>
                   {pointBreakdown.length > 0 && (
                      <div className="mt-3 text-xs text-orange-800 bg-orange-100/50 p-2 rounded-lg text-left space-y-1">
                         {pointBreakdown.map((line, i) => <div key={i}>• {line}</div>)}
                      </div>
                   )}
                </div>

                <button onClick={closeTest} className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:scale-105 transition shadow-xl text-lg">Back to Dashboard</button>
            </div>
         </div>
       )
    }

    const question = activeTest.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeTest.questions.length) * 100;
    const isAnswered = answers[currentQuestionIndex] !== -1;
    const selectedAnswer = answers[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswerIndex;

    return (
      <div className="fixed inset-0 z-[200] bg-[#0f172a] text-white flex flex-col h-screen w-screen overflow-hidden font-sans">
         {/* Background with radial gradient to mimic studio lighting */}
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-100 pointer-events-none"></div>
         
         {/* Grid overlay */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

         {/* Content Container */}
         <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto w-full p-6">
            
            {/* Header / Timer */}
            <div className="flex justify-between items-center mb-8">
               <button onClick={closeTest} className="p-2 rounded-full bg-slate-800 border border-slate-600 hover:border-white transition"><X className="w-6 h-6"/></button>
               <div className={`text-2xl font-mono font-bold tracking-widest ${timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                  {formatTime(timeRemaining)}
               </div>
               <div className="px-4 py-1 rounded-full bg-slate-800 border border-slate-600 text-sm font-bold text-cyan-400">
                  Q {currentQuestionIndex + 1} / {activeTest.questions.length}
               </div>
            </div>

            {/* Question Box - Hexagon-ish shape using borders/CSS */}
            <div className="flex-1 flex flex-col justify-center items-center mb-8 relative">
               <div className="relative w-full max-w-4xl">
                  {/* Decorative Lines connecting to answers */}
                  <div className="absolute top-full left-1/4 w-0.5 h-16 bg-cyan-600/50 hidden md:block"></div>
                  <div className="absolute top-full right-1/4 w-0.5 h-16 bg-cyan-600/50 hidden md:block"></div>
                  
                  {/* The Box */}
                  <div className="relative bg-slate-900/90 border-2 border-cyan-500 rounded-3xl p-8 md:p-12 text-center shadow-[0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-md">
                     {/* Corner Accents */}
                     <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl"></div>
                     <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl"></div>
                     <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl"></div>
                     <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl"></div>

                     <h2 className="text-2xl md:text-4xl font-display font-bold leading-relaxed text-white drop-shadow-lg">
                        {question.text}
                     </h2>
                  </div>
               </div>
            </div>

            {/* Answers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 md:px-12">
               {question.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isThisCorrect = idx === question.correctAnswerIndex;
                  const label = String.fromCharCode(65 + idx); // A, B, C, D

                  let borderColor = 'border-cyan-700';
                  let bgColor = 'bg-slate-900';
                  let shadowClass = 'hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:border-cyan-400';
                  
                  if (isAnswered) {
                     shadowClass = '';
                     if (isThisCorrect) {
                        borderColor = 'border-green-500';
                        bgColor = 'bg-green-900/60';
                        shadowClass = 'shadow-[0_0_20px_rgba(34,197,94,0.6)]';
                     } else if (isSelected) {
                        borderColor = 'border-red-500';
                        bgColor = 'bg-red-900/60';
                     } else {
                        borderColor = 'border-slate-700';
                        bgColor = 'bg-slate-900 opacity-50';
                     }
                  } else if (isSelected) {
                     borderColor = 'border-orange-400';
                     bgColor = 'bg-slate-800';
                     shadowClass = 'shadow-[0_0_15px_rgba(251,146,60,0.5)]';
                  }

                  return (
                     <button
                        key={idx}
                        onClick={() => !isAnswered && handleAnswer(idx)}
                        disabled={isAnswered}
                        className="relative group w-full"
                     >
                        <div className={`
                           flex items-center w-full p-4 md:p-6 rounded-full border-2 transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden
                           ${borderColor} ${bgColor} ${shadowClass}
                        `}>
                           {/* Letter Badge */}
                           <span className="text-orange-400 font-bold text-xl md:text-2xl mr-4 font-mono">{label}:</span>
                           <span className="text-white font-bold text-lg md:text-xl text-left flex-1">{opt}</span>
                        </div>
                     </button>
                  )
               })}
            </div>

            {/* Footer / Controls */}
            {isAnswered && (
               <div className="flex justify-center pb-6">
                  <button 
                     onClick={nextQuestion} 
                     className="px-12 py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xl uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
                  >
                     {currentQuestionIndex === activeTest.questions.length - 1 ? 'Finish Game' : 'Next Question'}
                  </button>
               </div>
            )}

         </div>
      </div>
    )
  }

  const renderReportModal = () => {
    if (!reportTestId) return null;
    const test = completedTests.find(t => t.id === reportTestId) || (baselineTest?.id === reportTestId ? baselineTest : null) || mockTests.find(t => t.id === reportTestId);
    if (!test) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
         <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl"><div><h3 className="text-xl font-bold text-gray-900">{test.title} Report</h3></div><button onClick={() => setReportTestId(null)} className="p-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-full"><X className="w-5 h-5"/></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
               {/* Score Summary */}
               <div className="flex items-center justify-center gap-8 mb-6">
                  <div className="text-center">
                     <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Score</p>
                     <p className="text-4xl font-display font-bold text-blue-600">{test.score}/{test.questions.length}</p>
                  </div>
               </div>

               {/* Detailed Breakdown */}
               <div>
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                     <List className="w-5 h-5 text-gray-500"/> Question Breakdown
                  </h4>
                  <div className="space-y-6">
                     {test.questions.map((q, idx) => {
                        const studentAnswerIdx = test.studentAnswers?.[idx] ?? -1;
                        const isCorrect = studentAnswerIdx === q.correctAnswerIndex;
                        const isSkipped = studentAnswerIdx === -1;

                        return (
                           <div key={q.id} className="p-6 bg-white rounded-3xl border border-gray-200 shadow-sm transition hover:shadow-md">
                              {/* Question Text */}
                              <div className="flex gap-4 mb-4">
                                 <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shrink-0 ${isCorrect ? 'bg-green-100 text-green-700' : isSkipped ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                                    {idx + 1}
                                 </div>
                                 <div className="flex-1">
                                    <h4 className="font-display font-bold text-gray-900 text-lg leading-snug">{q.text}</h4>
                                 </div>
                              </div>

                              {/* Options Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 pl-12">
                                 {q.options.map((opt, optIdx) => {
                                    const isSelected = studentAnswerIdx === optIdx;
                                    const isThisCorrect = q.correctAnswerIndex === optIdx;
                                    
                                    let optionClass = "border-gray-200 bg-gray-50 text-gray-600";
                                    let icon = null;

                                    if (isThisCorrect) {
                                       optionClass = "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500";
                                       icon = <CheckCircle className="w-5 h-5 text-green-600" />;
                                    } else if (isSelected) {
                                       optionClass = "border-red-400 bg-red-50 text-red-800";
                                       icon = <X className="w-5 h-5 text-red-500" />;
                                    }

                                    return (
                                       <div key={optIdx} className={`relative p-3 rounded-xl border-2 flex items-center justify-between gap-3 ${optionClass}`}>
                                          <div className="flex items-center gap-3">
                                             <span className="font-bold text-sm opacity-60">{String.fromCharCode(65 + optIdx)}.</span>
                                             <span className="font-medium text-sm leading-tight">{opt}</span>
                                          </div>
                                          {icon}
                                          {isSelected && !isThisCorrect && <span className="text-[9px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded absolute -top-2 -right-2 border border-red-200 shadow-sm">Your Answer</span>}
                                          {isSelected && isThisCorrect && <span className="text-[9px] font-bold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded absolute -top-2 -right-2 border border-green-200 shadow-sm">Correct</span>}
                                       </div>
                                    );
                                 })}
                              </div>

                              {/* Explanation */}
                              <div className="bg-blue-50/50 p-4 rounded-xl ml-12 border border-blue-100 flex items-start gap-3">
                                 <div className="p-1 bg-blue-100 text-blue-600 rounded-lg shrink-0 mt-0.5"><Lightbulb className="w-4 h-4"/></div>
                                 <div>
                                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wide block mb-1">Reason / Explanation</span>
                                    <p className="text-sm text-blue-900 leading-relaxed font-medium">
                                       {q.explanation || "No explanation provided."}
                                    </p>
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         </div>
      </div>
    )
  }

  const renderHistoryModal = () => {
    if (!historyModalTopicId) return null;
    const topic = topics.find(t => t.id === historyModalTopicId);
    if (!topic) return null;
    const metrics = getTopicMetrics(topic);

    return (
      <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
         <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-xl text-gray-900">{topic.name} Progress</h3>
               <button onClick={() => setHistoryModalTopicId(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                     <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">Tests Taken</p>
                     <p className="text-3xl font-display font-bold text-blue-700">{metrics.attempts}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                     <p className="text-xs font-bold text-purple-400 uppercase tracking-wide">Questions</p>
                     <p className="text-3xl font-display font-bold text-purple-700">{metrics.totalQuestionsAttempted}</p>
                  </div>
               </div>
               
               <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><History className="w-4 h-4 text-gray-400"/> Recent Activity</h4>
                  <div className="space-y-2">
                     {metrics.relevantTests.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No tests completed yet.</p>
                     ) : (
                        metrics.relevantTests.map(test => (
                           <div key={test.id} onClick={() => { setHistoryModalTopicId(null); setReportTestId(test.id); }} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer group transition">
                              <div><p className="font-bold text-sm text-gray-800">{test.title}</p><p className="text-xs text-gray-400">{new Date(test.assignedDate).toLocaleDateString()}</p></div>
                              <div className="flex items-center gap-2"><span className="font-mono font-bold text-sm text-blue-600">{test.score}/{test.questions.length}</span><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500"/></div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 text-center">
               <p className="text-xs text-gray-400 mb-2">Want to improve your score?</p>
               <button onClick={() => setHistoryModalTopicId(null)} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition">Practice This Topic</button>
            </div>
         </div>
      </div>
    );
  };

  const renderBookReader = () => {
    if (!bookState.isOpen || !bookState.subjectId) return null;
    const subject = subjects.find(s => s.id === bookState.subjectId);
    const subjectTopics = topics.filter(t => t.subjectId === bookState.subjectId).sort((a, b) => a.order - b.order);
    
    // Find active content
    let activeTopic = subjectTopics.find(t => t.id === bookState.currentTopicId) || subjectTopics[0];
    let activeSubTopic = activeTopic?.subTopics.find(st => st.id === bookState.currentSubTopicId) || activeTopic?.subTopics[0];

    // If no content, show fallback
    if (!activeTopic) return <div className="fixed inset-0 z-[150] bg-white flex items-center justify-center"><div className="text-center"><BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4"/><h3 className="text-xl font-bold text-gray-900">This book is empty</h3><button onClick={closeBook} className="mt-4 px-6 py-2 bg-gray-100 rounded-xl font-bold text-gray-600">Close</button></div></div>;

    return (
      <div className="fixed inset-0 z-[150] bg-white flex flex-col md:flex-row overflow-hidden animate-in fade-in slide-in-from-bottom-4">
         {/* Sidebar TOC */}
         <div className={`fixed inset-y-0 left-0 z-20 w-80 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileTocOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
               <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600"/> {subject?.name}</h3>
               <button onClick={() => setIsMobileTocOpen(false)} className="md:hidden p-2 text-gray-500"><X className="w-5 h-5"/></button>
            </div>
            <div className="overflow-y-auto h-full pb-20 p-4 space-y-6">
               {subjectTopics.map((topic, idx) => (
                  <div key={topic.id}>
                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">{idx + 1}. {topic.name}</h4>
                     <div className="space-y-1">
                        {topic.subTopics.map((sub) => (
                           <button 
                              key={sub.id} 
                              onClick={() => navigateToSubTopic(topic.id, sub.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${activeSubTopic?.id === sub.id ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-600 hover:bg-gray-200/50'}`}
                           >
                              {sub.name}
                           </button>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Main Content */}
         <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <button onClick={() => setIsMobileTocOpen(true)} className="md:hidden p-2 bg-gray-100 rounded-lg text-gray-600"><Menu className="w-5 h-5"/></button>
                  <span className="text-sm font-bold text-gray-400 uppercase hidden sm:inline-block">{activeTopic.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:inline-block"/>
                  <span className="text-sm font-bold text-gray-900">{activeSubTopic?.name}</span>
               </div>
               <button onClick={closeBook} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full transition"><X className="w-5 h-5"/></button>
            </div>

            {/* Content Scroll */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full">
               {activeSubTopic ? (
                  <div className="space-y-8 animate-in fade-in duration-500">
                     <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 leading-tight">{activeSubTopic.name}</h1>
                     
                     <div className="prose prose-lg prose-blue text-gray-600 leading-relaxed">
                        <p className="text-lg">{activeSubTopic.explanation}</p>
                     </div>

                     <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-24 h-24 text-yellow-500"/></div>
                        <h4 className="font-bold text-yellow-800 flex items-center gap-2 mb-2 relative z-10"><Target className="w-5 h-5"/> Learning Goal</h4>
                        <p className="text-yellow-900 relative z-10 font-medium">{activeSubTopic.learningObjective}</p>
                     </div>

                     <div className="bg-sky-50 border border-sky-100 p-6 rounded-2xl">
                        <h4 className="font-bold text-sky-800 flex items-center gap-2 mb-4"><Lightbulb className="w-5 h-5"/> Examples</h4>
                        <div className="space-y-3">
                           {activeSubTopic.exampleQuestions.map((ex, i) => (
                              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-sky-100 text-gray-700 font-medium flex gap-3">
                                 <span className="text-sky-400 font-bold">{i+1}.</span>
                                 {ex}
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                     <BookOpen className="w-16 h-16 mb-4 opacity-20"/>
                     <p>Select a lesson from the menu to start reading.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {activeMistakeQuestion && (
         <MistakeTutor 
            question={activeMistakeQuestion.question} 
            studentAnswer={activeMistakeQuestion.studentAnswer} 
            correctOption={activeMistakeQuestion.correctOption}
            subjectName={activeMistakeQuestion.subjectName}
            onClose={() => setActiveMistakeQuestion(null)}
         />
      )}
      {renderReportModal()}
      {renderActiveTest()} 
      {renderHistoryModal()}
      {renderBookReader()}
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden sticky top-0 z-30 md:static">
        {/* Decorative Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400 opacity-10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

        <div className="relative z-10">
          {isAdmin && !previewStudentId ? (
             <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-blue-200 uppercase tracking-wide">Simulating View For:</label>
                <select value={effectiveUserId} onChange={(e) => setAdminSelectedStudentId(e.target.value)} className="text-2xl font-display font-black text-white bg-transparent border-b-2 border-white/30 focus:border-white outline-none pb-1 pr-8 cursor-pointer hover:border-white/60 transition-colors">
                   {users.filter(u => u.role === UserRole.STUDENT).map(s => (<option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>))}
                </select>
             </div>
          ) : (
             <div>
                <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight drop-shadow-md">Hi, {effectiveUser?.name?.split(' ')[0]}! 👋</h2>
                <p className="text-blue-100 font-medium mt-1 text-lg">Ready to learn something new today?</p>
             </div>
          )}
        </div>
        
        <div className="relative z-10 flex gap-4">
           <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-lg hover:scale-105 transition-transform cursor-default group">
              <div className="bg-yellow-400 p-2.5 rounded-full shadow-md group-hover:rotate-12 transition-transform">
                 <Coins className="w-6 h-6 text-yellow-900" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase tracking-wide text-blue-100 font-extrabold">My Wallet</span>
                 <span className="text-2xl leading-none font-display font-black text-white">{effectiveUser?.coins || 0}</span>
              </div>
           </div>
        </div>
      </header>
      
      {/* NAVIGATION TABS (Floating Dock Style) */}
      <div className="bg-white p-2 rounded-3xl w-full max-w-4xl mx-auto shadow-xl shadow-slate-200/60 border border-white sticky top-24 z-20 md:static">
        <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
           {[
              { id: 'roadmap', label: 'My Map', icon: Map, color: 'bg-blue-500', hover: 'hover:bg-blue-50 hover:text-blue-600' },
              { id: 'library', label: 'Library', icon: Library, color: 'bg-pink-500', hover: 'hover:bg-pink-50 hover:text-pink-600' },
              { id: 'mocks', label: 'Mock Tests', icon: Layers, color: 'bg-purple-500', hover: 'hover:bg-purple-50 hover:text-purple-600' },
              { id: 'todo', label: 'Missions', icon: List, color: 'bg-orange-500', hover: 'hover:bg-orange-50 hover:text-orange-600' },
              { id: 'mistakes', label: 'Mistakes', icon: AlertTriangle, color: 'bg-red-500', hover: 'hover:bg-red-50 hover:text-red-600' },
              { id: 'rewards', label: 'Rewards', icon: ShoppingBag, color: 'bg-yellow-500', hover: 'hover:bg-yellow-50 hover:text-yellow-600' },
           ].map((tab) => (
              <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)} 
                 className={`
                    flex-1 min-w-[100px] py-3 px-4 rounded-2xl font-bold text-sm flex flex-col md:flex-row items-center justify-center gap-2 transition-all duration-300
                    ${activeTab === tab.id 
                       ? `${tab.color} text-white shadow-lg scale-105` 
                       : `bg-transparent text-gray-400 ${tab.hover}`
                    }
                 `}
              >
                 <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
                 <span className="hidden md:inline">{tab.label}</span>
                 {tab.id === 'todo' && pendingCount > 0 && activeTab !== 'todo' && (
                    <span className="ml-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full shadow-sm animate-pulse">{pendingCount}</span>
                 )}
              </button>
           ))}
        </div>
      </div>

      {activeTab === 'roadmap' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
           {/* Subject Badges */}
           <div className="flex gap-4 overflow-x-auto py-4 px-2 no-scrollbar justify-start md:justify-center mb-8">
             {subjects.filter(s => s.active).map(sub => (
               <button 
                  key={sub.id} 
                  onClick={() => setRoadmapSubjectId(sub.id)} 
                  className={`
                     relative flex flex-col items-center gap-2 p-4 min-w-[100px] rounded-3xl transition-all duration-300 group
                     ${roadmapSubjectId === sub.id 
                        ? 'bg-white border-4 border-blue-500 shadow-xl shadow-blue-100 scale-110 -translate-y-2 z-10' 
                        : 'bg-white border-2 border-slate-100 hover:border-blue-300 hover:-translate-y-1'
                     }
                  `}
               >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:rotate-6 ${sub.color}`}>
                     {getIconComponent(sub.icon)}
                  </div>
                  <span className={`font-display font-bold text-xs tracking-wide ${roadmapSubjectId === sub.id ? 'text-gray-900' : 'text-gray-400'}`}>{sub.name}</span>
                  {roadmapSubjectId === sub.id && <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-blue-500"></div>}
               </button>
             ))}
           </div>
           
           <div className="relative pb-32 max-w-xl mx-auto px-4">
              {/* Dashed Road Line */}
              <div className="absolute top-10 bottom-0 left-1/2 -ml-2 w-4 border-l-4 border-dashed border-gray-300 z-0 opacity-50"></div>
              
              {/* Baseline Node */}
              <div className="relative z-10 mb-24 flex flex-col items-center group">
                 <div className={`
                    w-28 h-28 rounded-full border-[6px] flex items-center justify-center bg-white shadow-2xl z-20 mb-6 transition-all duration-500 group-hover:scale-110 
                    ${isBaselineComplete 
                       ? 'border-green-500 text-green-500 shadow-green-100' 
                       : 'border-white ring-4 ring-slate-200 text-slate-300 animate-pulse'
                    }
                 `}>
                    {isBaselineComplete ? <Trophy className="w-12 h-12 fill-green-100"/> : <Play className="w-12 h-12 ml-2 fill-slate-100"/>}
                 </div>
                 
                 <div 
                    onClick={() => isBaselineComplete && baselineTest ? setReportTestId(baselineTest.id) : !isBaselineComplete && baselineTest ? startTest(baselineTest) : null} 
                    className={`
                       relative p-6 rounded-[2rem] text-center w-64 shadow-xl cursor-pointer transition-all hover:-translate-y-2 bg-white border-b-8 active:border-b-0 active:translate-y-2
                       ${isBaselineComplete 
                          ? 'border-green-200 shadow-green-100/50' 
                          : 'border-slate-200 hover:border-blue-300'
                       }
                    `}
                 >
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Start Here</span>
                    <h4 className="font-display font-bold text-gray-900 text-xl mb-1">Baseline</h4>
                    {isBaselineComplete ? (
                       <div className="inline-block px-4 py-1 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-100">
                          Score: {Math.round(((baselineTest?.score || 0) / (baselineTest?.questions.length || 1)) * 100)}%
                       </div>
                    ) : (
                       <span className="text-xs font-bold text-blue-500">Tap to Start Adventure</span>
                    )}
                 </div>
              </div>

              {/* Topic Nodes */}
              {topics.filter(t => t.subjectId === roadmapSubjectId).sort((a,b) => a.order - b.order).map((topic, index) => {
                 const metrics = getTopicMetrics(topic);
                 const pendingTest = myTests.find(t => t.topicId === topic.id && !t.completed);
                 const hasPending = !!pendingTest;
                 
                 const handleNodeClick = () => {
                    if (metrics.status === TopicStatus.LOCKED) {
                        alert("Complete previous topics first!");
                    } else {
                        setHistoryModalTopicId(topic.id);
                    }
                 };

                 const isLeft = index % 2 === 0;

                 return (
                   <div key={topic.id} className={`relative z-10 mb-20 w-full flex ${isLeft ? 'justify-start' : 'justify-end'} items-center group`}>
                      {/* Central Node */}
                      <div 
                        onClick={handleNodeClick} 
                        className={`
                           absolute left-1/2 -ml-8 w-16 h-16 rounded-full flex items-center justify-center z-20 transition-all duration-500 cursor-pointer border-4 shadow-xl hover:scale-110
                           ${metrics.status === TopicStatus.MASTERED 
                              ? 'bg-yellow-400 border-white text-white shadow-yellow-200' 
                              : metrics.status !== TopicStatus.LOCKED 
                                 ? 'bg-blue-500 border-white text-white shadow-blue-200 ring-4 ring-blue-100' 
                                 : 'bg-white border-slate-200 text-slate-300'
                           }
                        `}
                      >
                         {metrics.status === TopicStatus.MASTERED ? <Star className="w-8 h-8 fill-white"/> : metrics.status !== TopicStatus.LOCKED ? <span className="font-display font-black text-2xl">{index+1}</span> : <Lock className="w-6 h-6"/>}
                      </div>
                      
                      {/* Topic Card */}
                      <div className={`
                         relative w-[42%] p-5 rounded-[2rem] border-b-4 transition-all duration-300 hover:scale-105 cursor-pointer bg-white shadow-lg
                         ${metrics.status === TopicStatus.LOCKED ? 'border-slate-200 opacity-80' : 'border-blue-100 hover:border-blue-300 shadow-blue-50/50'}
                      `}>
                         <div className="flex flex-col gap-2">
                            <h4 className={`font-display font-bold text-base leading-tight ${metrics.status === TopicStatus.LOCKED ? 'text-gray-400' : 'text-gray-800'}`}>{topic.name}</h4>
                            
                            {metrics.status === TopicStatus.LOCKED ? (
                               <div className="self-start px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"><Lock className="w-3 h-3"/> Locked</div>
                            ) : (
                               <>
                                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                     <div className={`h-full rounded-full transition-all duration-1000 ${metrics.currentPercentage >= 80 ? 'bg-yellow-400' : 'bg-blue-500'}`} style={{ width: `${metrics.currentPercentage}%` }}></div>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                     <span className="text-xs font-bold text-gray-400">{metrics.currentPercentage}% XP</span>
                                     <div className="flex gap-2">
                                        <button 
                                           onClick={(e) => { e.stopPropagation(); if (hasPending && pendingTest) startTest(pendingTest); }} 
                                           disabled={!hasPending} 
                                           className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${hasPending ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-300'}`}
                                        >
                                           <Play className="w-4 h-4 fill-current"/>
                                        </button>
                                        <button onClick={(e) => {e.stopPropagation(); setHistoryModalTopicId(topic.id)}} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-blue-500 flex items-center justify-center transition-colors">
                                           <TrendingUp className="w-4 h-4"/>
                                        </button>
                                     </div>
                                  </div>
                               </>
                            )}
                         </div>
                         
                         {/* Connecting Line to Center */}
                         <div className={`absolute top-1/2 -translate-y-1/2 w-6 h-1 bg-gray-200 ${isLeft ? '-right-6' : '-left-6'}`}></div>
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>
      )}

      {/* ... (Library, Mocks, Todo Tabs - Unchanged) ... */}
      {activeTab === 'library' && (
         <div className="animate-in fade-in duration-500 grid grid-cols-2 md:grid-cols-4 gap-8 pb-20 px-4 mt-6">
            {subjects.filter(s => s.active).map(subject => (
               <div key={subject.id} onClick={() => openBook(subject.id)} className="group cursor-pointer perspective-1000">
                  <div className={`
                     aspect-[3/4] rounded-r-2xl rounded-l-md shadow-2xl transition-all duration-500 transform group-hover:-translate-y-4 group-hover:rotate-y-[-10deg] relative overflow-hidden 
                     ${subject.color} border-l-8 border-white/20
                  `}>
                     <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20"></div>
                     <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-black/10"></div> 
                     
                     <div className="p-6 h-full flex flex-col justify-between text-white relative z-10">
                        <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30">
                           {getIconComponent(subject.icon)}
                        </div>
                        <div>
                           <h3 className="font-display font-black text-2xl leading-tight mb-2 drop-shadow-md tracking-tight">{subject.name}</h3>
                           <div className="inline-block px-3 py-1 bg-black/20 rounded-lg backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest border border-white/10">Course Book</div>
                        </div>
                     </div>
                  </div>
                  <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                     <span className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full shadow-sm">Tap to Read</span>
                  </div>
               </div>
            ))}
         </div>
      )}

      {activeTab === 'mistakes' && (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 px-4 pb-24">
            {mistakeTestId ? (
               <div className="max-w-3xl mx-auto">
                  <button onClick={() => setMistakeTestId(null)} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-4 transition px-3 py-2 rounded-lg hover:bg-white"><ArrowLeft className="w-5 h-5"/> Back to Tests</button>
                  
                  <div className="space-y-4">
                     {testsWithMistakes.find(t => t.id === mistakeTestId)?.questions.map((q, idx) => {
                        const test = testsWithMistakes.find(t => t.id === mistakeTestId);
                        const studentAnsIdx = test?.studentAnswers?.[idx] ?? -1;
                        const isCorrect = studentAnsIdx === q.correctAnswerIndex;
                        const subjectName = subjects.find(s => s.id === test?.subjectId)?.name || 'General';

                        if (isCorrect) return null;

                        return (
                           <div key={idx} className="bg-white p-6 rounded-[2rem] border-2 border-red-50 shadow-md hover:shadow-lg transition-all group">
                              <div className="flex justify-between items-start mb-4">
                                 <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">Incorrect</span>
                                 <button 
                                    onClick={() => setActiveMistakeQuestion({ 
                                       question: q, 
                                       studentAnswer: q.options[studentAnsIdx] || 'Skipped', 
                                       correctOption: q.options[q.correctAnswerIndex],
                                       subjectName
                                    })} 
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition"
                                 >
                                    <BrainCircuit className="w-4 h-4"/> Start Mistake Tutor
                                 </button>
                              </div>
                              <h4 className="font-bold text-lg text-slate-800 mb-2">{q.text}</h4>
                              <p className="text-red-500 font-medium text-sm mb-1"><span className="font-bold">Your Answer:</span> {q.options[studentAnsIdx] || 'Skipped'}</p>
                              <p className="text-green-600 font-medium text-sm"><span className="font-bold">Correct Answer:</span> {q.options[q.correctAnswerIndex]}</p>
                           </div>
                        )
                     })}
                  </div>
               </div>
            ) : (
               <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                     <h3 className="font-display font-bold text-2xl text-slate-800">Learn from Mistakes</h3>
                     <p className="text-slate-500 mt-1">Review past tests and fix your errors with AI help.</p>
                  </div>
                  
                  {testsWithMistakes.length === 0 ? (
                     <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-3"/>
                        <h3 className="font-bold text-xl text-gray-900">No Mistakes Found!</h3>
                        <p className="text-gray-500">You've scored 100% on all completed tests. Amazing job!</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {testsWithMistakes.map(test => (
                           <div key={test.id} onClick={() => setMistakeTestId(test.id)} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:border-red-200 hover:shadow-md cursor-pointer transition flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                    <AlertTriangle className="w-6 h-6"/>
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-slate-800">{test.title}</h4>
                                    <p className="text-xs text-slate-400 font-bold">{new Date(test.assignedDate).toLocaleDateString()}</p>
                                    <p className="text-xs text-red-500 font-medium">Score: {test.score}/{test.questions.length}</p>
                                 </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-500"/>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}
         </div>
      )}

      {activeTab === 'mocks' && (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 px-4 pb-24">
            {/* Stats Header */}
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-purple-600 text-white p-5 rounded-3xl shadow-lg shadow-purple-200">
                  <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">Tests Taken</p>
                  <p className="text-3xl font-display font-black">{mockTests.filter(t => t.completed).length}</p>
               </div>
               <div className="bg-white border-2 border-purple-100 p-5 rounded-3xl shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-purple-400 mb-1">Total Questions</p>
                  <p className="text-3xl font-display font-black text-purple-900">{mockTests.filter(t => t.completed).reduce((acc, t) => acc + t.questions.length, 0)}</p>
               </div>
            </div>

            {/* Pending Tests */}
            {mockTests.filter(t => !t.completed).length > 0 && (
               <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 px-2">Ready to Start</h3>
                  <div className="space-y-6">
                     {mockTests.filter(t => !t.completed).map(test => {
                        const testSubjects = subjects.filter(s => (test.subjectIds || [test.subjectId]).includes(s.id));
                        return (
                           <div key={test.id} className="bg-white p-6 rounded-[2rem] border-2 border-purple-50 shadow-xl shadow-purple-100/50 flex flex-col md:flex-row md:items-center justify-between hover:border-purple-200 transition-all duration-300 group relative overflow-hidden">
                              <div className="relative z-10 space-y-4">
                                 <span className="inline-flex items-center gap-1 text-[10px] font-black bg-purple-100 text-purple-600 px-3 py-1 rounded-full uppercase tracking-widest">
                                    <Clock className="w-3 h-3"/> Pending Test
                                 </span>
                                 <div>
                                    <h4 className="font-display font-bold text-gray-900 text-2xl">{test.title.replace(/Exam/i, 'Test')}</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                       {testSubjects.map(s => (
                                          <span key={s.id} className={`text-[10px] font-bold px-2 py-1 rounded-lg border bg-white ${s.color.replace('bg-', 'text-').replace('600','600').replace('500','600')} border-gray-100 shadow-sm`}>
                                             {s.name}
                                          </span>
                                       ))}
                                    </div>
                                 </div>
                                 <p className="text-gray-500 font-medium flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1"><List className="w-4 h-4"/> {test.questions.length} Qs</span>
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {test.duration} m</span>
                                 </p>
                              </div>
                              <button onClick={() => startTest(test)} className="mt-4 md:mt-0 px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg hover:bg-purple-600 hover:shadow-purple-200 transition-all transform group-hover:-translate-y-1 relative z-10 shrink-0">
                                 Start Test
                              </button>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}

            {/* Completed Tests History */}
            <div>
               <h3 className="text-lg font-bold text-gray-900 mb-4 px-2 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400"/> Test History
               </h3>
               {mockTests.filter(t => t.completed).length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                        <Layers className="w-8 h-8"/>
                     </div>
                     <p className="text-gray-400 font-bold text-sm">No completed tests yet.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {mockTests.filter(t => t.completed).map(test => {
                        const score = test.score || 0;
                        const total = test.questions.length;
                        const percent = Math.round((score/total)*100);
                        const testSubjects = subjects.filter(s => (test.subjectIds || [test.subjectId]).includes(s.id));

                        return (
                           <div key={test.id} onClick={() => setReportTestId(test.id)} className="bg-white p-5 rounded-[2rem] border-2 border-gray-100 hover:border-blue-200 cursor-pointer transition-all group flex items-center justify-between shadow-sm hover:shadow-md">
                              <div>
                                 <div className="flex flex-wrap gap-2 mb-2">
                                    {testSubjects.map(s => (
                                       <span key={s.id} className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                          {s.name}
                                       </span>
                                    ))}
                                 </div>
                                 <h4 className="font-display font-bold text-gray-900 text-lg mb-1">{test.title.replace(/Exam/i, 'Test')}</h4>
                                 <p className="text-xs text-gray-400 font-bold">{new Date(test.assignedDate).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                 <div className={`text-2xl font-display font-black ${percent >= 80 ? 'text-green-500' : percent >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                    {percent}%
                                 </div>
                                 <p className="text-xs font-bold text-gray-400">{score}/{total}</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>
         </div>
      )}

      {/* ... Todo Tab (Renamed Missions) ... */}
      {activeTab === 'todo' && (
        <div className="space-y-6 animate-in fade-in duration-500 mt-6 px-4">
           {myTests.length === 0 && myPlans.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                 <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400 animate-bounce">
                    <Smile className="w-12 h-12"/>
                 </div>
                 <h3 className="font-display font-bold text-gray-900 text-2xl">All Clear!</h3>
                 <p className="text-gray-500 font-medium">You have no pending missions. Go play!</p>
              </div>
           ) : (
              myTests.map(test => (
                 <div key={test.id} className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-gray-100 flex flex-col md:flex-row md:items-center justify-between hover:shadow-lg hover:border-orange-200 transition-all duration-300 gap-6 group">
                    <div className="flex items-center gap-5">
                       <div className={`w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                          {test.type === TestType.MOCK ? <Layers className="w-8 h-8"/> : <Target className="w-8 h-8"/>}
                       </div>
                       <div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-50 text-blue-500`}>
                             {test.type === TestType.MOCK ? 'Mock Test' : 'Quick Quiz'}
                          </span>
                          <h4 className="font-display font-bold text-gray-900 text-xl mt-2 mb-1">{test.title.replace(/Exam/i, 'Test')}</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">{test.duration} Minutes</p>
                       </div>
                    </div>
                    <button onClick={() => startTest(test)} className="w-full md:w-auto bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-200 hover:-translate-y-1">
                       Start Test
                    </button>
                 </div>
              ))
           )}
        </div>
      )}

      {/* Rewards Tab (Store + History) */}
      {activeTab === 'rewards' && (
         <div className="animate-in fade-in duration-500 mt-6 px-4">
            
            {/* View Switcher */}
            <div className="flex justify-center mb-8">
               <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm inline-flex">
                  <button onClick={() => setRewardView('store')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${rewardView === 'store' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
                     <Store className="w-4 h-4"/> Store
                  </button>
                  <button onClick={() => setRewardView('history')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${rewardView === 'history' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
                     <History className="w-4 h-4"/> My History
                  </button>
               </div>
            </div>

            {rewardView === 'store' && (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20 animate-in slide-in-from-left-4">
                  {availableRewards.map(reward => {
                     const canAfford = (effectiveUser?.coins || 0) >= reward.cost;
                     const isPending = myRequests.some(r => r.rewardId === reward.id);
                     const isApproved = rewardRequests.some(r => r.studentId === effectiveUserId && r.rewardId === reward.id && r.status === 'APPROVED');

                     return (
                        <div key={reward.id} className={`
                           bg-white rounded-[2rem] p-6 border-2 flex flex-col items-center text-center transition-all duration-300 group relative
                           ${canAfford && !isPending && !isApproved
                              ? 'border-gray-100 hover:border-yellow-400 hover:shadow-xl hover:-translate-y-2 cursor-pointer' 
                              : 'border-gray-100 opacity-80'
                           }
                        `}>
                           {isPending && (
                              <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-lg animate-pulse">
                                 Pending Approval
                              </div>
                           )}
                           {isApproved && (
                              <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">
                                 Approved
                              </div>
                           )}
                           <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-500 ${reward.color}`}>
                              {getRewardIcon(reward.icon, "w-10 h-10")}
                           </div>
                           <h4 className="font-display font-bold text-gray-900 mb-2 leading-tight min-h-[3rem] flex items-center justify-center">{reward.name}</h4>
                           <div className="text-yellow-500 font-black text-xl mb-6 flex items-center gap-1 bg-yellow-50 px-4 py-1 rounded-full">
                              {reward.cost} <Coins className="w-5 h-5 fill-yellow-500"/>
                           </div>
                           <button 
                              onClick={() => canAfford && !isPending && !isApproved && handleRequestReward(reward)}
                              disabled={!canAfford || isPending || isApproved}
                              className={`
                                 w-full py-3 rounded-xl font-bold text-sm transition-all shadow-md
                                 ${isPending 
                                    ? 'bg-yellow-50 text-yellow-600 cursor-default'
                                    : isApproved 
                                       ? 'bg-green-50 text-green-600 cursor-default'
                                       : canAfford 
                                          ? 'bg-gray-900 text-white hover:bg-yellow-500 hover:text-yellow-900 hover:shadow-yellow-200' 
                                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                 }
                              `}
                           >
                              {isPending ? 'Requested' : isApproved ? 'Approved' : canAfford ? (reward.approvalRequired ? 'Request' : 'Buy Now') : 'Need Coins'}
                           </button>
                        </div>
                     )
                  })}
               </div>
            )}

            {rewardView === 'history' && (
               <div className="animate-in slide-in-from-right-4 space-y-8 pb-20">
                  {/* Lifetime Stats */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-green-500 text-white p-6 rounded-[2rem] shadow-lg shadow-green-200">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-100 mb-1">Lifetime Earned</p>
                        <p className="text-4xl font-display font-black">{totalEarned}</p>
                     </div>
                     <div className="bg-orange-500 text-white p-6 rounded-[2rem] shadow-lg shadow-orange-200">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-100 mb-1">Total Spent</p>
                        <p className="text-4xl font-display font-black">{totalSpent}</p>
                     </div>
                  </div>

                  {/* Claimed List */}
                  <div>
                     <h3 className="font-display font-bold text-gray-900 text-xl mb-4 px-2">Reward History</h3>
                     {rewardHistory.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 text-gray-400">
                           <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                           <p className="font-bold text-sm">No rewards claimed yet.</p>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {rewardHistory.map((item, i) => (
                              <div key={`${item.id}-${i}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                                       {getRewardIcon(item.icon)}
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-gray-900">{item.name}</h4>
                                       <p className="text-xs text-gray-400 font-bold">{new Date(item.date).toLocaleDateString()}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-sm font-black text-orange-500">-{item.cost}</div>
                                    <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded mt-1 inline-block ${item.type === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                       {item.type === 'APPROVED' ? 'Approved' : 'Instant'}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            )}
         </div>
      )}
      
      {/* Footer */}
      <div className="absolute bottom-4 text-center w-full text-xs font-bold text-blue-900/30">
         © 2024 11+ Gen67
      </div>
    </div>
  );
};
