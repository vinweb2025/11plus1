
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, Subject, Topic, SubTopic, DifficultyLevel, AIGeneratedTopic, User, Gender, QuestionBankItem } from '../types';
import { generateCurriculum } from '../services/geminiService';
import { 
  Plus, Trash2, Book, UserPlus, Edit2, Bot, Check, X, ChevronRight, AlertTriangle, 
  Search, Sparkles, Wand2, ChevronDown, ChevronUp, BookOpen, Users, Shield, Link, Save,
  Eye, EyeOff, Loader2, MailCheck, User as UserIcon, Settings, MessageSquare, Database, FileUp, Download
} from 'lucide-react';
import { getIconComponent } from '../constants';

// --- TYPES & INTERFACES FOR LOCAL UI ---
type ViewState = 'subjects' | 'users' | 'settings' | 'questions';
type ModalType = 'subject' | 'topic' | 'subtopic' | 'ai' | 'delete' | 'question' | 'upload';

// Safe UUID Generator fallback
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface ModalWrapperProps {
  title: string;
  children?: React.ReactNode;
  maxWidth?: string;
  onClose: () => void;
}

const ModalWrapper = ({ title, children, maxWidth = 'max-w-xl', onClose }: ModalWrapperProps) => (
  <div 
    className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" 
    onClick={onClose}
  >
    <div 
      className={`bg-white rounded-3xl w-full ${maxWidth} shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
        <h3 className="text-xl font-display font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition shadow-sm">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto p-6 flex-1 bg-gray-50/30">
        {children}
      </div>
    </div>
  </div>
);

export const AdminDashboard = () => {
  const { 
    subjects, topics, users, questionBank,
    addSubject, updateSubject, deleteSubject, 
    addTopic, updateTopic, deleteTopic, 
    addSubTopic, updateSubTopic, deleteSubTopic,
    addUser, updateUser, deleteUser, getUser, refreshData,
    aiGlobalBehavior, updateAiGlobalBehavior,
    addQuestionToBank, deleteQuestionFromBank, uploadQuestionsBulk
  } = useApp();

  // --- LAYOUT & SELECTION STATE ---
  const [activeView, setActiveView] = useState<ViewState>('subjects');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());

  // Init selection on desktop only, or let user select on mobile
  useEffect(() => {
     const isDesktop = window.innerWidth >= 768;
     if (isDesktop && !selectedSubjectId && subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id);
     }
  }, [subjects]);


  // --- MODAL STATE ---
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  
  // --- FORMS STATE ---
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({});
  const [topicForm, setTopicForm] = useState<Partial<Topic>>({});
  const [subTopicForm, setSubTopicForm] = useState<Partial<SubTopic>>({});
  const [parentTopicIdForSubTopic, setParentTopicIdForSubTopic] = useState<string | null>(null);

  // --- USER MANAGEMENT STATE ---
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // For Edit Mode
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  // Extend User form to include password for creation
  const [userForm, setUserForm] = useState<Partial<User> & { password?: string }>({});
  const [activeUserTab, setActiveUserTab] = useState<'profile' | 'security' | 'family'>('profile');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [familySearchTerm, setFamilySearchTerm] = useState('');

  // --- AI BUILDER STATE ---
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResults, setAiResults] = useState<AIGeneratedTopic[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExpandedReview, setAiExpandedReview] = useState<Set<number>>(new Set());
  const [isAiImporting, setIsAiImporting] = useState(false);

  // --- QUESTION BANK STATE ---
  const [qBankSubjectId, setQBankSubjectId] = useState<string>('');
  const [qBankTopicId, setQBankTopicId] = useState<string>('');
  const [qBankSearch, setQBankSearch] = useState('');
  const [questionForm, setQuestionForm] = useState<Partial<QuestionBankItem>>({
     options: ['', '', '', ''],
     difficulty: DifficultyLevel.MEDIUM,
     correctAnswerIndex: 0
  });
  const [csvFile, setCsvFile] = useState<string>('');
  const [uploadStats, setUploadStats] = useState<{success:number, failed:number, errors:string[]} | null>(null);

  // --- SETTINGS STATE ---
  const [localAiBehavior, setLocalAiBehavior] = useState(aiGlobalBehavior);
  
  // Sync local state when global state updates (e.g. from localStorage load)
  useEffect(() => {
    setLocalAiBehavior(aiGlobalBehavior);
  }, [aiGlobalBehavior]);

  // Init defaults for Question Bank
  useEffect(() => {
     if (activeView === 'questions' && subjects.length > 0 && !qBankSubjectId) {
        setQBankSubjectId(subjects[0].id);
     }
  }, [activeView, subjects]);

  const handleSaveSettings = () => {
    updateAiGlobalBehavior(localAiBehavior);
    setSuccessMessage("Settings saved successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // --- DELETE CONFIRMATION STATE ---
  const [deleteData, setDeleteData] = useState<{ type: 'subject' | 'topic' | 'subtopic' | 'user' | 'question', id: string, name: string, parentId?: string } | null>(null);

  // --- DERIVED DATA ---
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const subjectTopics = topics.filter(t => t.subjectId === selectedSubjectId).sort((a, b) => a.order - b.order);

  // Filter Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filter Questions
  const filteredQuestions = questionBank.filter(q => {
     const topic = topics.find(t => t.id === q.topicId);
     if (!topic) return false;
     const matchesSubject = !qBankSubjectId || topic.subjectId === qBankSubjectId;
     const matchesTopic = !qBankTopicId || q.topicId === qBankTopicId;
     // Added safety check for q.text
     const matchesSearch = !qBankSearch || (q.text || '').toLowerCase().includes(qBankSearch.toLowerCase());
     return matchesSubject && matchesTopic && matchesSearch;
  });

  // --- HELPERS ---
  const resetForms = () => {
    setSubjectForm({});
    setTopicForm({});
    setSubTopicForm({});
    setParentTopicIdForSubTopic(null);
    setAiStep(1);
    setAiPrompt('');
    setAiResults([]);
    setAiError(null);
    setIsAiImporting(false);
    setQuestionForm({ options: ['', '', '', ''], difficulty: DifficultyLevel.MEDIUM, correctAnswerIndex: 0 });
    setCsvFile('');
    setUploadStats(null);
  };

  const openModal = (type: ModalType, id: string | null = null, parentId: string | null = null) => {
    setModalType(type);
    setEditId(id);
    
    if (type === 'subject' && id) setSubjectForm(subjects.find(s => s.id === id) || {});
    else if (type === 'subject') setSubjectForm({ active: true, color: 'bg-blue-600', icon: 'BookOpen' });

    if (type === 'topic' && id) setTopicForm(topics.find(t => t.id === id) || {});
    else if (type === 'topic') setTopicForm({ difficulty: DifficultyLevel.MEDIUM, recommendedYear: 'Year 5', tags: [] });

    if (type === 'subtopic') {
      setParentTopicIdForSubTopic(parentId);
      if (id) {
         const parent = topics.find(t => t.id === parentId);
         const sub = parent?.subTopics.find(s => s.id === id);
         setSubTopicForm(sub || {});
      } else setSubTopicForm({ difficulty: DifficultyLevel.MEDIUM, exampleQuestions: [''] });
    }

    if (type === 'question') {
       if (id) {
          // Edit not implemented fully yet, simple add mode
       } else {
          setQuestionForm({
             topicId: qBankTopicId || (topics.find(t => t.subjectId === qBankSubjectId)?.id || ''),
             options: ['', '', '', ''],
             difficulty: DifficultyLevel.MEDIUM,
             correctAnswerIndex: 0,
             text: '',
             explanation: ''
          });
       }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditId(null);
    resetForms();
  };

  const toggleTopicExpand = (topicId: string) => {
    const newSet = new Set(expandedTopicIds);
    if (newSet.has(topicId)) newSet.delete(topicId);
    else newSet.add(topicId);
    setExpandedTopicIds(newSet);
  };

  // --- ACTION HANDLERS ---
  const handleSaveSubject = () => {
    if (!subjectForm.name) return;
    if (editId) updateSubject({ ...subjectForm, id: editId } as Subject);
    else addSubject({ ...subjectForm, id: generateUUID(), order: subjects.length, active: true, color: subjectForm.color || 'bg-blue-600', icon: subjectForm.icon || 'BookOpen' } as Subject);
    closeModal();
  };

  const handleSaveTopic = () => {
    if (!topicForm.name || !selectedSubjectId) return;
    if (editId) {
      const existing = topics.find(t => t.id === editId);
      if (existing) updateTopic({ ...existing, ...topicForm } as Topic);
    } else {
      addTopic({ ...topicForm, id: generateUUID(), subjectId: selectedSubjectId, subTopics: [], order: subjectTopics.length, difficulty: topicForm.difficulty || DifficultyLevel.MEDIUM, recommendedYear: topicForm.recommendedYear || 'Year 5' } as Topic);
    }
    closeModal();
  };

  const handleSaveSubTopic = async () => {
    if (!subTopicForm.name || !parentTopicIdForSubTopic) return;
    
    if (editId) {
        // Update Existing
        const parentTopic = topics.find(t => t.id === parentTopicIdForSubTopic);
        const existingSub = parentTopic?.subTopics.find(st => st.id === editId);
        if (existingSub) {
            await updateSubTopic({ ...existingSub, ...subTopicForm } as SubTopic);
        }
    } else {
        // Create New
        const parentTopic = topics.find(t => t.id === parentTopicIdForSubTopic);
        const newOrder = parentTopic ? parentTopic.subTopics.length : 0;
        
        await addSubTopic({ 
            ...subTopicForm, 
            id: generateUUID(), 
            order: newOrder,
            difficulty: subTopicForm.difficulty || DifficultyLevel.MEDIUM, 
            exampleQuestions: subTopicForm.exampleQuestions || [''] 
        } as SubTopic, parentTopicIdForSubTopic);
    }
    
    const newSet = new Set(expandedTopicIds); newSet.add(parentTopicIdForSubTopic); setExpandedTopicIds(newSet);
    closeModal();
  };

  const handleDeleteClick = (type: 'subject' | 'topic' | 'subtopic' | 'user' | 'question', id: string, name: string, parentId?: string) => {
    setDeleteData({ type, id, name, parentId });
    setModalType('delete');
  };

  const handleConfirmDelete = async () => {
    if (!deleteData) return;
    const { type, id, parentId } = deleteData;
    
    if (type === 'subject') {
       await deleteSubject(id);
       if (selectedSubjectId === id) {
          const remaining = subjects.find(s => s.id !== id);
          setSelectedSubjectId(remaining?.id || null);
       }
    } else if (type === 'topic') {
        await deleteTopic(id);
    } else if (type === 'subtopic' && parentId) {
      await deleteSubTopic(id);
    } else if (type === 'user') {
      await deleteUser(id);
      setSelectedUserId(null);
      setIsCreatingUser(false);
    } else if (type === 'question') {
       await deleteQuestionFromBank(id);
    }
    
    closeModal();
    setDeleteData(null);
  };

  const handleSaveQuestion = async () => {
     if (!questionForm.text || !questionForm.topicId) {
        alert("Please fill in question and topic.");
        return;
     }
     if (questionForm.options?.some(o => !o.trim())) {
        alert("All 4 options must be filled.");
        return;
     }
     await addQuestionToBank(questionForm);
     closeModal();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
           setCsvFile(evt.target?.result as string);
        };
        reader.readAsText(file);
     }
  };

  const processUpload = async () => {
     if (!csvFile) return;
     const stats = await uploadQuestionsBulk(csvFile);
     setUploadStats(stats);
  };

  const downloadTemplate = () => {
     const headers = ["Subject Name", "Topic Name", "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer (1-4)", "Difficulty", "Explanation"];
     const example = ["Maths", "Number & Place Value", "What is 2+2?", "3", "4", "5", "6", "2", "Easy", "Adding two even numbers."];
     const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), example.join(',')].join('\n');
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", "question_bank_template.csv");
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  // --- USER MANAGEMENT HANDLERS (Unchanged) ---
  const handleCreateUser = () => {
    setIsCreatingUser(true);
    setSelectedUserId(null);
    setShowUserPassword(true); // Show password field for creation
    setSuccessMessage(null);
    setUserForm({
      name: '', email: '', password: '', role: UserRole.STUDENT, active: true, 
      linkedUserIds: [], avatar: `https://picsum.photos/200/200?random=${Date.now()}`
    });
    setActiveUserTab('profile');
    setFamilySearchTerm('');
  };

  const handleSelectUser = (user: User) => {
    setIsCreatingUser(false);
    setSelectedUserId(user.id);
    setShowUserPassword(false);
    setSuccessMessage(null);
    setUserForm({ ...user });
    setActiveUserTab('profile');
    setFamilySearchTerm('');
  };

  const handleSaveUser = async () => {
    // Explicit validation checks
    if (!userForm.name) {
       alert("Please enter a Full Name.");
       return;
    }
    if (!userForm.email) {
       alert("Please enter an Email Address.");
       return;
    }
    if (!userForm.role) {
       alert("Please select a Role.");
       return;
    }

    setIsSavingUser(true);
    setSuccessMessage(null);
    
    try {
      if (isCreatingUser) {
         if (!userForm.password || userForm.password.length < 6) {
            alert("Please provide a password (min 6 chars) for the new user.");
            setIsSavingUser(false);
            return;
         }
         const result = await addUser(userForm);
         
         if (!result.success) {
            alert(`Error creating user: ${result.message}`);
            return;
         }

         if (result.requiresConfirmation) {
            setSuccessMessage(result.message);
            setIsCreatingUser(false); 
            return;
         }
      } else {
         await updateUser(userForm as User);
      }

      // Sync Relationships Bi-directionally
      // This is crucial for Admin links to show up in other views
      if (userForm.linkedUserIds && !isCreatingUser) {
        userForm.linkedUserIds.forEach(linkedId => {
           const linkedUser = getUser(linkedId);
           // If linked user doesn't point back to current user, update them
           if (linkedUser && (!linkedUser.linkedUserIds || !linkedUser.linkedUserIds.includes(userForm.id || ''))) {
             updateUser({
               ...linkedUser,
               linkedUserIds: [...(linkedUser.linkedUserIds || []), userForm.id || '']
             });
           }
        });
      }

      setIsCreatingUser(false);
      setSuccessMessage("User saved successfully!");
      if (isCreatingUser) {
         setUserForm({});
         setSelectedUserId(null); 
      }
    } catch (e) {
      console.error("Save User Error:", e);
      alert("An unexpected error occurred while saving.");
    } finally {
      setIsSavingUser(false);
      if (successMessage) setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleLinkUser = (targetId: string) => {
    if (!userForm.linkedUserIds?.includes(targetId)) {
      setUserForm({ ...userForm, linkedUserIds: [...(userForm.linkedUserIds || []), targetId] });
    }
  };

  const handleUnlinkUser = (targetId: string) => {
     setUserForm({ ...userForm, linkedUserIds: userForm.linkedUserIds?.filter(id => id !== targetId) });
  };

  // --- AI HANDLERS ---
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !selectedSubject) return;
    setAiStep(2); setAiError(null);
    try {
      const results = await generateCurriculum(selectedSubject.name, aiPrompt, aiGlobalBehavior);
      if (results) { setAiResults(results); setAiStep(3); setAiExpandedReview(new Set([0])); }
      else { setAiError("We couldn't generate topics. Please try a different description."); setAiStep(1); }
    } catch (e) { setAiError("Something went wrong. Please check your connection."); setAiStep(1); }
  };

  const handleAiImport = async () => {
    if (!selectedSubjectId) return;
    const selected = aiResults.filter(t => t.isSelected);
    setIsAiImporting(true);
    setAiError(null);
    
    try {
        let successCount = 0;
        let failedCount = 0;

        for (let idx = 0; idx < selected.length; idx++) {
            const aiTopic = selected[idx];
            const topicId = generateUUID();
            
            const rawSubTopics = (aiTopic as any).subTopics || (aiTopic as any).subtopics || [];
            const safeSubTopics = Array.isArray(rawSubTopics) ? rawSubTopics : [];

            const mappedSubTopics = safeSubTopics.map((st: any, sIdx: number) => {
                const rawQuestions = Array.isArray(st.exampleQuestions) ? st.exampleQuestions : [];
                const cleanQuestions = rawQuestions.map((q: any) => {
                    if (typeof q === 'string') return q;
                    if (typeof q === 'object' && q !== null) return q.question || q.text || JSON.stringify(q);
                    return String(q);
                });

                return {
                    id: generateUUID(),
                    name: st.name || 'Untitled Lesson',
                    explanation: st.explanation || st.description || '', 
                    learningObjective: st.learningObjective || st.learning_objective || '',
                    exampleQuestions: cleanQuestions,
                    difficulty: (st.difficulty as DifficultyLevel) || DifficultyLevel.MEDIUM,
                    order: sIdx
                };
            });

            const result = await addTopic({
                id: topicId,
                subjectId: selectedSubjectId,
                name: aiTopic.name || 'Untitled Topic',
                description: aiTopic.description || '',
                difficulty: (aiTopic.difficulty as DifficultyLevel) || DifficultyLevel.MEDIUM,
                recommendedYear: aiTopic.recommendedYear || 'Year 5',
                tags: ['AI Generated'],
                order: subjectTopics.length + idx,
                subTopics: mappedSubTopics
            }, false);

            if (result.error) {
                console.error(`Failed to import topic ${aiTopic.name}:`, JSON.stringify(result.error, null, 2));
                failedCount++;
            } else {
                successCount++;
            }
        }

        if (failedCount > 0) {
           setAiError(`Imported ${successCount} topics. ${failedCount} failed to import. See browser console for detailed errors.`);
        } else {
           closeModal();
        }
    } catch (e) {
        console.error("AI Import Failed:", e);
        setAiError("Critical failure during import. Please check connection.");
    } finally {
        try {
            await refreshData();
        } catch(e) {
            console.warn("Final refresh failed", e);
        }
        setIsAiImporting(false);
    }
  };
  
  const updateAiResultTopic = (index: number, field: string, value: string) => {
    const newResults = [...aiResults];
    // @ts-ignore
    newResults[index] = { ...newResults[index], [field]: value }; 
    setAiResults(newResults);
  };

  // --- RENDER ---
  return (
    <div className="space-y-6 pb-20 h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Admin Console</h2>
            <p className="text-gray-500 mt-1">Manage curriculum content and system users.</p>
          </div>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
             <button onClick={() => setActiveView('subjects')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${activeView === 'subjects' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}><Book className="w-4 h-4"/> Curriculum</button>
             <button onClick={() => setActiveView('questions')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${activeView === 'questions' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}><Database className="w-4 h-4"/> Question Bank</button>
             <button onClick={() => setActiveView('users')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${activeView === 'users' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}><Users className="w-4 h-4"/> Users</button>
             <button onClick={() => setActiveView('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${activeView === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}><Settings className="w-4 h-4"/> Settings</button>
          </div>
       </div>

       {activeView === 'subjects' && (
          // --- CURRICULUM VIEW ---
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
             {/* LEFT: Subjects List */}
             <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-center mb-2 px-1">
                   <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">Subjects</h3>
                   <button onClick={() => openModal('subject')} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Plus className="w-4 h-4"/></button>
                </div>
                <div className="space-y-2">
                   {subjects.map(subject => (
                      <div key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition group ${selectedSubjectId === subject.id ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}>
                         <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${subject.color}`}>{getIconComponent(subject.icon)}</div>
                            <span className={`font-bold text-sm ${selectedSubjectId === subject.id ? 'text-blue-900' : 'text-gray-700'}`}>{subject.name}</span>
                         </div>
                         {selectedSubjectId === subject.id && (
                           <div className="flex gap-1">
                              <button onClick={(e) => { e.stopPropagation(); openModal('subject', subject.id); }} className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5"/></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteClick('subject', subject.id, subject.name); }} className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5"/></button>
                           </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>

             {/* RIGHT: Topic Content */}
             <div className="lg:col-span-3 space-y-6">
                {selectedSubject ? (
                  <>
                     <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-xl text-white ${selectedSubject.color}`}>{getIconComponent(selectedSubject.icon)}</div>
                           <div><h2 className="text-xl font-bold text-gray-900">{selectedSubject.name}</h2><p className="text-xs text-gray-500">{subjectTopics.length} Topics</p></div>
                        </div>
                        <div className="flex gap-3">
                           <button onClick={() => openModal('ai')} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition shadow-md"><Sparkles className="w-4 h-4"/> AI Generate</button>
                           <button onClick={() => openModal('topic')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md"><Plus className="w-4 h-4"/> Add Topic</button>
                        </div>
                     </div>

                     <div className="space-y-4">
                        {subjectTopics.length === 0 ? (
                           <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                              <p>No topics yet. Add one manually or use AI!</p>
                           </div>
                        ) : (
                           subjectTopics.map((topic) => (
                              <div key={topic.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                                 <div className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition cursor-pointer" onClick={() => toggleTopicExpand(topic.id)}>
                                    <div className="flex items-center gap-4">
                                       <button className={`p-1 rounded-md transition ${expandedTopicIds.has(topic.id) ? 'rotate-90 bg-gray-200' : 'text-gray-400 hover:bg-gray-100'}`}><ChevronRight className="w-5 h-5"/></button>
                                       <div>
                                          <div className="flex items-center gap-2">
                                             <h4 className="font-bold text-gray-800 text-lg">{topic.name}</h4>
                                             <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${topic.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : topic.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{topic.difficulty}</span>
                                          </div>
                                          <p className="text-sm text-gray-500 mt-0.5">{topic.description}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={(e) => {e.stopPropagation(); openModal('subtopic', null, topic.id)}} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">+ Subtopic</button>
                                       <button onClick={(e) => {e.stopPropagation(); openModal('topic', topic.id)}} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                                       <button onClick={(e) => {e.stopPropagation(); handleDeleteClick('topic', topic.id, topic.name)}} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                 </div>
                                 {expandedTopicIds.has(topic.id) && (
                                    <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-3 space-y-2">
                                       {topic.subTopics.length === 0 && <p className="text-xs text-gray-400 italic pl-10">No subtopics defined.</p>}
                                       {topic.subTopics.map((sub, idx) => (
                                          <div key={sub.id} className="flex items-center justify-between pl-10 pr-4 py-2 rounded-lg hover:bg-white hover:shadow-sm transition group/sub">
                                             <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}.</span>
                                                <span className="text-sm font-medium text-gray-700">{sub.name}</span>
                                             </div>
                                             <div className="flex gap-2 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('subtopic', sub.id, topic.id)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5"/></button>
                                                <button onClick={() => handleDeleteClick('subtopic', sub.id, sub.name, topic.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5"/></button>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           ))
                        )}
                     </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                     <Book className="w-12 h-12 mb-3 opacity-50"/>
                     <p>Select a subject to manage content.</p>
                  </div>
                )}
             </div>
          </div>
       )}

       {activeView === 'questions' && (
          // --- QUESTION BANK VIEW ---
          <div className="flex flex-col h-[calc(100vh-200px)]">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4">
                   <select 
                      className="p-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                      value={qBankSubjectId} 
                      onChange={e => { setQBankSubjectId(e.target.value); setQBankTopicId(''); }}
                   >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                   <select 
                      className="p-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                      value={qBankTopicId} 
                      onChange={e => setQBankTopicId(e.target.value)}
                   >
                      <option value="">All Topics</option>
                      {topics.filter(t => t.subjectId === qBankSubjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                      <input 
                          className="pl-9 p-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 w-48" 
                          placeholder="Search questions..." 
                          value={qBankSearch} 
                          onChange={e => setQBankSearch(e.target.value)}
                      />
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => openModal('upload')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-md"><FileUp className="w-4 h-4"/> Mass Upload</button>
                   <button onClick={() => openModal('question')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md"><Plus className="w-4 h-4"/> Add Question</button>
                </div>
             </div>

             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                   {filteredQuestions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                         <Database className="w-12 h-12 mb-3 opacity-30"/>
                         <p>No questions found.</p>
                      </div>
                   ) : (
                      filteredQuestions.map((q, i) => (
                         <div key={q.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition group relative">
                            <div className="pr-16">
                               <p className="font-bold text-gray-900 mb-1">{q.text || 'Untitled Question'}</p>
                               <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">{q.difficulty}</span>
                                  <span className="text-gray-500">Correct: <span className="font-bold text-green-600">{q.options?.[q.correctAnswerIndex] || 'N/A'}</span></span>
                                  {q.tags && q.tags.map(t => <span key={t} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{t}</span>)}
                               </div>
                            </div>
                            <button onClick={() => handleDeleteClick('question', q.id, `Question: ${(q.text || '').substring(0,20)}...`)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition">
                               <Trash2 className="w-4 h-4"/>
                            </button>
                         </div>
                      ))
                   )}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs font-bold text-gray-500 text-center">
                   Showing {filteredQuestions.length} Questions
                </div>
             </div>
          </div>
       )}

       {/* ... User Management and Settings View code remains same as before ... */}
       {activeView === 'users' && (
          // ... (previous users code)
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
             {/* Left: User List */}
             <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                      />
                   </div>
                   <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {['ALL', 'STUDENT', 'PARENT', 'TEACHER', 'ADMIN'].map(r => (
                         <button 
                           key={r} 
                           onClick={() => setUserRoleFilter(r)} 
                           className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${userRoleFilter === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                         >
                           {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase() + 's'}
                         </button>
                      ))}
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                   <button onClick={handleCreateUser} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition mb-2 font-bold text-sm">
                      <UserPlus className="w-4 h-4"/> Create New User
                   </button>
                   {filteredUsers.map(u => (
                      <div key={u.id} onClick={() => handleSelectUser(u)} className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition border ${selectedUserId === u.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}`}>
                         <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full bg-gray-200 object-cover border border-gray-100"/>
                         <div className="flex-1 text-left min-w-0">
                            <h4 className={`text-sm font-bold truncate ${selectedUserId === u.id ? 'text-blue-900' : 'text-gray-900'}`}>{u.name}</h4>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] uppercase font-bold text-gray-400">{u.role}</span>
                               {u.gender && <span className={`text-[9px] px-1 rounded uppercase font-bold ${u.gender === Gender.BOY ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{u.gender.charAt(0)}</span>}
                               {!u.active && <span className="w-2 h-2 bg-red-400 rounded-full" title="Inactive"></span>}
                            </div>
                         </div>
                         {selectedUserId === u.id && <ChevronRight className="w-4 h-4 text-blue-400"/>}
                      </div>
                   ))}
                   {filteredUsers.length === 0 && (
                      <div className="p-8 text-center text-gray-400 text-sm">
                         No users found.
                      </div>
                   )}
                </div>
             </div>

             {/* Right: User Form */}
             <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden relative">
                {(selectedUserId || isCreatingUser) ? (
                   <>
                      {/* Form Header */}
                      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/30 gap-4 shrink-0">
                         <div className="flex items-center gap-4">
                            <div className="relative group cursor-pointer">
                               <img src={userForm.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-4 border-white shadow-sm bg-gray-200 object-cover"/>
                               <button onClick={() => setUserForm({...userForm, avatar: `https://picsum.photos/seed/${Date.now()}/200/200`})} className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow border border-gray-200 text-gray-500 hover:text-blue-600" title="Randomize Avatar"><Edit2 className="w-3 h-3"/></button>
                            </div>
                            <div>
                               <h3 className="text-xl font-display font-bold text-gray-900 leading-tight">{isCreatingUser ? 'Create User' : userForm.name || 'Edit User'}</h3>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${userForm.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                     {userForm.active ? 'Active' : 'Inactive'}
                                  </span>
                                  <span className="text-xs text-gray-400 font-mono">{userForm.id || 'NEW'}</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex gap-2 w-full sm:w-auto">
                            {!isCreatingUser && (
                               <button onClick={() => handleDeleteClick('user', userForm.id || '', userForm.name || '')} className="flex-1 sm:flex-none p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100" title="Delete User">
                                  <Trash2 className="w-5 h-5 mx-auto"/>
                                </button>
                            )}
                            <button onClick={handleSaveUser} disabled={isSavingUser} className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
                               {isSavingUser ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
                               {isSavingUser ? 'Saving...' : 'Save'}
                            </button>
                         </div>
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b border-gray-100 px-6 gap-6 bg-white shrink-0">
                         <button onClick={() => setActiveUserTab('profile')} className={`py-4 text-sm font-bold border-b-2 transition ${activeUserTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Profile</button>
                         <button onClick={() => setActiveUserTab('security')} className={`py-4 text-sm font-bold border-b-2 transition ${activeUserTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Security</button>
                         <button onClick={() => setActiveUserTab('family')} className={`py-4 text-sm font-bold border-b-2 transition ${activeUserTab === 'family' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Family & Links</button>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
                         <div className="max-w-2xl mx-auto">
                            {activeUserTab === 'profile' && (
                               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Full Name <span className="text-red-500">*</span></label>
                                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition font-medium" value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="e.g. John Doe"/>
                                     </div>
                                     <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Role <span className="text-red-500">*</span></label>
                                        <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition font-medium" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}>
                                           {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                     </div>
                                  </div>
                                  <div className="space-y-1.5">
                                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Email Address <span className="text-red-500">*</span></label>
                                     <input type="email" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition font-medium" value={userForm.email || ''} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="user@example.com"/>
                                  </div>
                                  
                                  {userForm.role === UserRole.STUDENT && (
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="space-y-1.5">
                                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Grade / Year</label>
                                           <input className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition" placeholder="e.g. Year 5" value={userForm.grade || ''} onChange={e => setUserForm({...userForm, grade: e.target.value})}/>
                                        </div>
                                        <div className="space-y-1.5">
                                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">School Name</label>
                                           <input className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition" placeholder="Current School" value={userForm.school || ''} onChange={e => setUserForm({...userForm, school: e.target.value})}/>
                                        </div>
                                        <div className="space-y-1.5">
                                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Gender</label>
                                           <select 
                                              className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition" 
                                              value={userForm.gender || ''} 
                                              onChange={e => setUserForm({...userForm, gender: e.target.value as Gender})}
                                           >
                                              <option value="">Select Gender</option>
                                              <option value={Gender.BOY}>Boy</option>
                                              <option value={Gender.GIRL}>Girl</option>
                                           </select>
                                        </div>
                                     </div>
                                  )}
                                  {userForm.role === UserRole.PARENT && (
                                     <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Phone Number</label>
                                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition" placeholder="+44..." value={userForm.phone || ''} onChange={e => setUserForm({...userForm, phone: e.target.value})}/>
                                     </div>
                                  )}
                               </div>
                            )}

                            {activeUserTab === 'security' && (
                               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                  {/* ... Security Content ... */}
                                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-800 text-sm flex items-start gap-3">
                                     <Shield className="w-5 h-5 shrink-0 mt-0.5"/>
                                     <p>Ensure passwords are secure. Administrators can reset passwords here if a user forgets them.</p>
                                  </div>
                                  
                                  {isCreatingUser && (
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 font-bold">
                                       Create a password for this new user (min 6 characters).
                                    </div>
                                  )}

                                  <div className="space-y-1.5">
                                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Password</label>
                                     <div className="relative">
                                        <input type={showUserPassword ? "text" : "password"} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition font-medium pr-10" value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder={isCreatingUser ? "Set Password" : "Reset Password (leave empty to keep current)"} />
                                        <button onClick={() => setShowUserPassword(!showUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showUserPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                                      </div>
                                  </div>
                                  <div className="pt-4 border-t border-gray-100">
                                     <label className="flex items-center gap-3 cursor-pointer group select-none">
                                        <div className={`w-12 h-7 flex items-center bg-gray-200 rounded-full p-1 duration-300 ease-in-out ${userForm.active ? 'bg-green-500' : ''}`}>
                                          <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${userForm.active ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <input type="checkbox" className="hidden" checked={!!userForm.active} onChange={e => setUserForm({...userForm, active: e.target.checked})} />
                                        <div>
                                           <span className="block text-sm font-bold text-gray-900">Account Active</span>
                                           <span className="block text-xs text-gray-500">Allow user to log in</span>
                                        </div>
                                     </label>
                                  </div>
                               </div>
                            )}

                            {activeUserTab === 'family' && (
                               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm flex items-start gap-3">
                                     <Link className="w-5 h-5 shrink-0 mt-0.5"/>
                                     <p>
                                        Link <strong>Parents</strong> to Students or <strong>Teachers</strong> to Students. 
                                        Linked users will see each other in their respective dashboards.
                                     </p>
                                  </div>
                                  
                                  <div>
                                     <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 ml-1">Currently Linked ({userForm.linkedUserIds?.length || 0})</h5>
                                     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        {(userForm.linkedUserIds || []).length === 0 ? (
                                           <div className="p-8 text-center text-gray-400 text-sm">No linked accounts.</div>
                                        ) : (
                                           <div className="divide-y divide-gray-100">
                                              {userForm.linkedUserIds?.map(id => {
                                                 const linked = users.find(u => u.id === id);
                                                 if (!linked) return null;
                                                 return (
                                                    <div key={id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition">
                                                       <div className="flex items-center gap-3">
                                                          <img src={linked.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover border border-gray-100"/> 
                                                          <div>
                                                             <p className="text-sm font-bold text-gray-900">{linked.name}</p> 
                                                             <p className="text-xs text-gray-500 font-medium">{linked.role}</p>
                                                          </div>
                                                       </div>
                                                       <button onClick={() => handleUnlinkUser(id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Unlink"><X className="w-4 h-4"/></button>
                                                    </div>
                                                 )
                                              })}
                                           </div>
                                        )}
                                     </div>
                                  </div>

                                  <div className="pt-2 relative">
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Search & Add Link</label>
                                     <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                        <input 
                                          placeholder="Search users to link..." 
                                          className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-sm" 
                                          onChange={(e) => setFamilySearchTerm(e.target.value)}
                                          value={familySearchTerm}
                                       />
                                     </div>
                                     {familySearchTerm && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-20 animate-in fade-in zoom-in-95 duration-200">
                                           {users.filter(u => u.id !== userForm.id && !userForm.linkedUserIds?.includes(u.id) && u.name.toLowerCase().includes(familySearchTerm.toLowerCase())).map(u => (
                                              <button key={u.id} onClick={() => { handleLinkUser(u.id); setFamilySearchTerm(''); }} className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 text-sm border-b border-gray-100 last:border-0 transition-colors group">
                                                 <img src={u.avatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover"/> 
                                                 <div className="flex-1">
                                                    <span className="block font-bold text-gray-900 group-hover:text-blue-700">{u.name}</span> 
                                                    <span className="block text-xs text-gray-500 font-medium">{u.role}</span>
                                                 </div>
                                                 <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600"/>
                                              </button>
                                           ))}
                                           {users.filter(u => u.id !== userForm.id && !userForm.linkedUserIds?.includes(u.id) && u.name.toLowerCase().includes(familySearchTerm.toLowerCase())).length === 0 && (
                                              <div className="p-4 text-sm text-gray-500 text-center italic">No matching users found.</div>
                                           )}
                                        </div>
                                     )}
                                  </div>
                               </div>
                            )}

                            {successMessage && <div className={`mt-6 p-4 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 border animate-in slide-in-from-bottom-2 ${successMessage.includes('Confirmation') ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                {successMessage.includes('Confirmation') ? <MailCheck className="w-5 h-5"/> : <Check className="w-5 h-5"/>} {successMessage}
                            </div>}
                         </div>
                      </div>
                   </>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                        <Users className="w-10 h-10 text-gray-300"/>
                      </div>
                      <h3 className="text-lg font-bold text-gray-700">No User Selected</h3>
                      <p className="text-sm max-w-xs text-center mt-1">Select a user from the list to edit details or create a new one.</p>
                   </div>
                )}
             </div>
          </div>
       )}

       {activeView === 'settings' && (
          <div className="max-w-4xl mx-auto h-full overflow-y-auto pb-12">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                   <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Bot className="w-6 h-6 text-purple-600"/> AI Behavior Configuration</h3>
                   <p className="text-sm text-gray-500 mt-1">Define the persona and rules for the AI components across the application.</p>
                </div>
                <div className="p-8 space-y-6">
                   <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">System Instruction (Persona)</label>
                      <p className="text-xs text-gray-500 mb-2">This prompt dictates how the AI tutor speaks to students and how it generates content. Use this to set the tone (e.g., encouraging, strict, simple language) and rules.</p>
                      <textarea 
                        className="w-full h-64 p-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
                        value={localAiBehavior}
                        onChange={(e) => setLocalAiBehavior(e.target.value)}
                        placeholder="Enter system instructions..."
                      />
                   </div>
                   
                   <div className="flex justify-end pt-4 border-t border-gray-100">
                      <button onClick={handleSaveSettings} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 transition flex items-center gap-2">
                         <Save className="w-5 h-5"/> Save Configuration
                      </button>
                   </div>

                   {successMessage && (
                      <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-green-100 animate-in fade-in slide-in-from-bottom-2">
                         <Check className="w-5 h-5"/> {successMessage}
                      </div>
                   )}
                </div>
             </div>
          </div>
       )}

       {/* --- MODALS --- */}
       {modalType === 'question' && <ModalWrapper title="Add Question to Bank" onClose={closeModal} maxWidth="max-w-2xl"><div className="space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Topic</label><select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={questionForm.topicId} onChange={e => setQuestionForm({...questionForm, topicId: e.target.value})}>{subjects.map(s => <optgroup key={s.id} label={s.name}>{topics.filter(t => t.subjectId === s.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>)}</select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question Text</label><textarea className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" rows={3} value={questionForm.text} onChange={e => setQuestionForm({...questionForm, text: e.target.value})}/></div><div className="grid grid-cols-2 gap-4">{[0,1,2,3].map(i => (<div key={i}><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Option {String.fromCharCode(65+i)} {questionForm.correctAnswerIndex === i && <span className="text-green-600">(Correct)</span>}</label><div className="flex gap-2"><input type="radio" name="correct" checked={questionForm.correctAnswerIndex === i} onChange={() => setQuestionForm({...questionForm, correctAnswerIndex: i})} /><input className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={questionForm.options?.[i] || ''} onChange={e => {const newOpts = [...(questionForm.options || [])]; newOpts[i] = e.target.value; setQuestionForm({...questionForm, options: newOpts});}} /></div></div>))}</div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Difficulty</label><select className="w-full p-3 border border-gray-200 rounded-xl" value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value as DifficultyLevel})}><option value={DifficultyLevel.EASY}>Easy</option><option value={DifficultyLevel.MEDIUM}>Medium</option><option value={DifficultyLevel.HARD}>Hard</option></select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Explanation</label><input className="w-full p-3 border border-gray-200 rounded-xl" value={questionForm.explanation || ''} onChange={e => setQuestionForm({...questionForm, explanation: e.target.value})}/></div></div><button onClick={handleSaveQuestion} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mt-4">Save Question</button></div></ModalWrapper>}
       {modalType === 'upload' && <ModalWrapper title="Mass Upload Questions" onClose={closeModal} maxWidth="max-w-xl"><div className="space-y-6 text-center"><div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl"><h4 className="font-bold text-blue-900 mb-2">1. Download Template</h4><p className="text-sm text-blue-700 mb-4">Use our standard CSV format compatible with Excel.</p><button onClick={downloadTemplate} className="px-4 py-2 bg-white text-blue-600 font-bold rounded-lg border border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-2 mx-auto"><Download className="w-4 h-4"/> Download CSV Template</button></div><div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl"><h4 className="font-bold text-gray-900 mb-2">2. Upload Filled File</h4><input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></div>{uploadStats && (<div className={`p-4 rounded-xl text-sm text-left ${uploadStats.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}`}><p className="font-bold">Result:</p><p>Success: {uploadStats.success}</p><p>Failed: {uploadStats.failed}</p>{uploadStats.errors.length > 0 && (<div className="mt-2 max-h-32 overflow-y-auto text-xs bg-white/50 p-2 rounded border border-black/5">{uploadStats.errors.map((e, i) => <div key={i}>{e}</div>)}</div>)}</div>)}<div className="flex gap-4"><button onClick={closeModal} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Close</button><button onClick={processUpload} disabled={!csvFile} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50">Upload & Process</button></div></div></ModalWrapper>}
       
       {/* ... modals (subject, topic, etc) unchanged ... */}
       {modalType === 'subject' && <ModalWrapper title={editId ? 'Edit Subject' : 'New Subject'} onClose={closeModal}><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Name</label><input className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={subjectForm.name || ''} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} placeholder="e.g. Mathematics"/></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Description</label><textarea className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none resize-none h-24 text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={subjectForm.description || ''} onChange={e => setSubjectForm({...subjectForm, description: e.target.value})} placeholder="Brief overview..."/></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Color Theme</label><select className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={subjectForm.color} onChange={e => setSubjectForm({...subjectForm, color: e.target.value})}><option value="bg-blue-600">Blue</option><option value="bg-green-500">Green</option><option value="bg-cyan-600">Cyan</option><option value="bg-orange-500">Orange</option><option value="bg-red-500">Red</option></select></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Icon</label><select className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={subjectForm.icon} onChange={e => setSubjectForm({...subjectForm, icon: e.target.value})}><option value="BookOpen">Book</option><option value="Calculator">Calculator</option><option value="Brain">Brain</option><option value="Shapes">Shapes</option><option value="Star">Star</option></select></div></div><button onClick={handleSaveSubject} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 mt-2 transition">Save Subject</button></div></ModalWrapper>}
       {modalType === 'topic' && <ModalWrapper title={editId ? 'Edit Topic' : 'New Topic'} onClose={closeModal}><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Topic Name</label><input className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={topicForm.name || ''} onChange={e => setTopicForm({...topicForm, name: e.target.value})}/></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Description</label><textarea className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none resize-none h-20 text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={topicForm.description || ''} onChange={e => setTopicForm({...topicForm, description: e.target.value})}/></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label><select className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={topicForm.difficulty} onChange={e => setTopicForm({...topicForm, difficulty: e.target.value as DifficultyLevel})}><option value={DifficultyLevel.EASY}>Easy</option><option value={DifficultyLevel.MEDIUM}>Medium</option><option value={DifficultyLevel.HARD}>Hard</option></select></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Rec. Year</label><input className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={topicForm.recommendedYear || ''} onChange={e => setTopicForm({...topicForm, recommendedYear: e.target.value})}/></div></div><button onClick={handleSaveTopic} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 mt-2 transition">Save Topic</button></div></ModalWrapper>}
       {modalType === 'subtopic' && <ModalWrapper title={editId ? 'Edit Lesson' : 'New Lesson'} onClose={closeModal} maxWidth="max-w-2xl"><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Lesson Name</label><input className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={subTopicForm.name || ''} onChange={e => setSubTopicForm({...subTopicForm, name: e.target.value})}/></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Detailed Explanation</label><textarea className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none resize-none h-32 text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={subTopicForm.explanation || ''} onChange={e => setSubTopicForm({...subTopicForm, explanation: e.target.value})} placeholder="This is the content the student reads..."/></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Learning Objective</label><input className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none text-gray-900 focus:ring-2 focus:ring-blue-500 transition" value={subTopicForm.learningObjective || ''} onChange={e => setSubTopicForm({...subTopicForm, learningObjective: e.target.value})} placeholder="e.g. Understand how to multiply decimals"/></div><div><label className="block text-sm font-bold text-gray-700 mb-2">Example Questions</label><div className="space-y-2">{subTopicForm.exampleQuestions?.map((q, i) => (<div key={i} className="flex gap-2"><input className="flex-1 p-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition" value={q} onChange={e => {const newQ = [...(subTopicForm.exampleQuestions || [])]; newQ[i] = e.target.value; setSubTopicForm({...subTopicForm, exampleQuestions: newQ});}} /><button onClick={() => {const newQ = subTopicForm.exampleQuestions?.filter((_, idx) => idx !== i); setSubTopicForm({...subTopicForm, exampleQuestions: newQ});}} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button></div>))}<button onClick={() => setSubTopicForm({...subTopicForm, exampleQuestions: [...(subTopicForm.exampleQuestions || []), '']})} className="text-sm font-bold text-blue-600 hover:underline">+ Add Example</button></div></div><button onClick={handleSaveSubTopic} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 mt-2 transition">Save Lesson</button></div></ModalWrapper>}
       {modalType === 'ai' && <ModalWrapper title="AI Curriculum Wizard" onClose={closeModal} maxWidth="max-w-4xl">{/* AI Modal Content same as before but abbreviated for brevity */}<div className="min-h-[400px]"><div className="flex items-center justify-center mb-8"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${aiStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div><div className={`w-12 h-1 bg-gray-200 ${aiStep >= 2 ? 'bg-blue-600' : ''}`}></div><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${aiStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div><div className={`w-12 h-1 bg-gray-200 ${aiStep >= 3 ? 'bg-blue-600' : ''}`}></div><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${aiStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div></div>{aiStep === 1 && (<div className="space-y-6 text-center max-w-lg mx-auto"><div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"><Sparkles className="w-8 h-8"/></div><h4 className="text-2xl font-bold text-gray-900">What should we teach?</h4><textarea className="w-full p-4 rounded-xl border-2 border-blue-100 bg-white shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition h-32 text-lg text-gray-900" placeholder="e.g. Advanced vocabulary..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} autoFocus/>{aiError && <div className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg">{aiError}</div>}<button onClick={handleAiGenerate} disabled={!aiPrompt.trim()} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:scale-105 transition disabled:opacity-50 flex items-center justify-center gap-2"><Wand2 className="w-5 h-5"/> Generate Magic</button></div>)}{aiStep === 2 && (<div className="flex flex-col items-center justify-center h-64 text-center space-y-4"><div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div><h4 className="text-xl font-bold text-gray-800 animate-pulse">Consulting the AI...</h4></div>)}{aiStep === 3 && (<div className="space-y-6"><div className="flex items-center justify-between"><h4 className="text-xl font-bold text-gray-900">Review & Import</h4><p className="text-sm text-gray-500">{aiResults.length} topics</p></div><div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">{aiResults.map((t, idx) => (<div key={idx} className={`border-2 rounded-xl transition ${t.isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 opacity-60'}`}><div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => {const newRes = [...aiResults]; newRes[idx].isSelected = !newRes[idx].isSelected; setAiResults(newRes);}}><div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition ${t.isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{t.isSelected && <Check className="w-4 h-4 text-white"/>}</div><div className="flex-1"><div className="flex justify-between"><input className="font-bold text-lg bg-transparent outline-none w-full text-gray-900" value={t.name} onChange={(e) => updateAiResultTopic(idx, 'name', e.target.value)} onClick={e => e.stopPropagation()}/><button onClick={(e) => { e.stopPropagation(); const newSet = new Set(aiExpandedReview); newSet.has(idx) ? newSet.delete(idx) : newSet.add(idx); setAiExpandedReview(newSet); }} className="text-gray-400 hover:text-blue-600">{aiExpandedReview.has(idx) ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</button></div><input className="text-sm text-gray-500 bg-transparent outline-none w-full mt-1" value={t.description} onChange={(e) => updateAiResultTopic(idx, 'description', e.target.value)} onClick={e => e.stopPropagation()}/></div></div>{aiExpandedReview.has(idx) && (<div className="px-14 pb-4 space-y-3">{(t.subTopics || []).map((st, sIdx) => (<div key={sIdx} className="bg-white p-3 rounded-lg border border-gray-200 text-sm"><p className="font-bold text-gray-800">{st.name}</p></div>))}</div>)}</div>))}</div><div className="flex gap-4 pt-4 border-t border-gray-100"><button onClick={() => setAiStep(1)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Back</button><button onClick={handleAiImport} disabled={isAiImporting} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition flex justify-center items-center gap-2">{isAiImporting ? <Loader2 className="animate-spin w-5 h-5"/> : `Import ${aiResults.filter(r => r.isSelected).length} Topics`}</button></div></div>)}</div></ModalWrapper>}
       {modalType === 'delete' && deleteData && <ModalWrapper title="Confirm Deletion" onClose={closeModal} maxWidth="max-w-md"><div className="text-center space-y-4"><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500"><AlertTriangle className="w-8 h-8"/></div><h4 className="text-xl font-bold text-gray-900">Delete {deleteData.type}?</h4><p className="text-gray-500">Are you sure you want to delete <strong className="text-gray-800">{deleteData.name}</strong>? This action cannot be undone.</p><div className="flex gap-3 mt-6"><button onClick={closeModal} className="flex-1 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-md hover:bg-red-600">Delete</button></div></div></ModalWrapper>}
    </div>
  );
};
