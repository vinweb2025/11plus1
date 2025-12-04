
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, Subject, Topic, SubTopic, DifficultyLevel, AIGeneratedTopic, User } from '../types';
import { generateCurriculum } from '../services/geminiService';
import { 
  Plus, Trash2, Book, UserPlus, Edit2, MoveUp, MoveDown, 
  Bot, Check, X, ChevronRight, List, AlertTriangle, 
  Search, Sparkles, Wand2, ChevronDown, ChevronUp,
  Layout, BookOpen, Layers, MoreVertical, Users, Shield, Link,
  Mail, Phone, School, Calendar, Eye, EyeOff
} from 'lucide-react';
import { getIconComponent } from '../constants';

// --- TYPES & INTERFACES FOR LOCAL UI ---
type ViewState = 'subjects' | 'users';
type ModalType = 'subject' | 'topic' | 'subtopic' | 'ai' | 'delete';

interface ModalWrapperProps {
  title: string;
  children?: React.ReactNode;
  maxWidth?: string;
  onClose: () => void;
}

const ModalWrapper = ({ title, children, maxWidth = 'max-w-xl', onClose }: ModalWrapperProps) => (
  <div 
    className="fixed inset-0 bg-gray-50/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" 
    onClick={onClose}
  >
    <div 
      className={`bg-white rounded-3xl w-full ${maxWidth} shadow-2xl flex flex-col max-h-[90vh] border border-gray-100`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl">
        <h3 className="text-xl font-display font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto p-6 flex-1">
        {children}
      </div>
    </div>
  </div>
);

export const AdminDashboard = () => {
  const { 
    subjects, topics, users, 
    addSubject, updateSubject, deleteSubject, 
    addTopic, updateTopic, deleteTopic, 
    addUser, updateUser, deleteUser, getUser
  } = useApp();

  // --- LAYOUT & SELECTION STATE ---
  const [activeView, setActiveView] = useState<ViewState>('subjects');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id || null);
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());

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
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userForm, setUserForm] = useState<Partial<User>>({});
  const [activeUserTab, setActiveUserTab] = useState<'profile' | 'security' | 'family'>('profile');
  const [familySearchTerm, setFamilySearchTerm] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- AI BUILDER STATE ---
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResults, setAiResults] = useState<AIGeneratedTopic[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExpandedReview, setAiExpandedReview] = useState<Set<number>>(new Set());

  // --- DELETE CONFIRMATION STATE ---
  const [deleteData, setDeleteData] = useState<{ type: 'subject' | 'topic' | 'subtopic' | 'user', id: string, name: string, parentId?: string } | null>(null);

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
  };

  const openModal = (type: ModalType, id: string | null = null, parentId: string | null = null) => {
    setModalType(type);
    setEditId(id);
    
    if (type === 'subject' && id) setSubjectForm(subjects.find(s => s.id === id) || {});
    else if (type === 'subject') setSubjectForm({ active: true, color: 'bg-indigo-500', icon: 'BookOpen' });

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
  };

  const closeModal = () => {
    setModalType(null);
    setEditId(null);
    resetForms();
  };

  // --- ACTION HANDLERS ---

  // Subject/Topic handlers (omitted for brevity, assume same as before)
  const handleSaveSubject = () => {
    if (!subjectForm.name) return;
    if (editId) updateSubject({ ...subjectForm, id: editId } as Subject);
    else addSubject({ ...subjectForm, id: `s-${Date.now()}`, order: subjects.length, active: true, color: subjectForm.color || 'bg-indigo-500', icon: subjectForm.icon || 'BookOpen' } as Subject);
    closeModal();
  };

  const handleSaveTopic = () => {
    if (!topicForm.name || !selectedSubjectId) return;
    if (editId) {
      const existing = topics.find(t => t.id === editId);
      if (existing) updateTopic({ ...existing, ...topicForm } as Topic);
    } else {
      addTopic({ ...topicForm, id: `t-${Date.now()}`, subjectId: selectedSubjectId, subTopics: [], order: subjectTopics.length, difficulty: topicForm.difficulty || DifficultyLevel.MEDIUM, recommendedYear: topicForm.recommendedYear || 'Year 5' } as Topic);
    }
    closeModal();
  };

  const handleSaveSubTopic = () => {
    if (!subTopicForm.name || !parentTopicIdForSubTopic) return;
    const parentTopic = topics.find(t => t.id === parentTopicIdForSubTopic);
    if (!parentTopic) return;
    let newSubTopics = [...parentTopic.subTopics];
    if (editId) newSubTopics = newSubTopics.map(st => st.id === editId ? { ...st, ...subTopicForm } as SubTopic : st);
    else newSubTopics.push({ ...subTopicForm, id: `st-${Date.now()}`, order: parentTopic.subTopics.length, difficulty: subTopicForm.difficulty || DifficultyLevel.MEDIUM, exampleQuestions: subTopicForm.exampleQuestions || [''] } as SubTopic);
    updateTopic({ ...parentTopic, subTopics: newSubTopics });
    const newSet = new Set(expandedTopicIds); newSet.add(parentTopicIdForSubTopic); setExpandedTopicIds(newSet);
    closeModal();
  };

  const handleDeleteClick = (type: 'subject' | 'topic' | 'subtopic' | 'user', id: string, name: string, parentId?: string) => {
    setDeleteData({ type, id, name, parentId });
    setModalType('delete');
  };

  const handleConfirmDelete = () => {
    if (!deleteData) return;
    const { type, id, parentId } = deleteData;
    if (type === 'subject') {
       deleteSubject(id);
       if (selectedSubjectId === id) setSelectedSubjectId(subjects[0]?.id || null);
    } else if (type === 'topic') deleteTopic(id);
    else if (type === 'subtopic' && parentId) {
      const parent = topics.find(t => t.id === parentId);
      if (parent) updateTopic({ ...parent, subTopics: parent.subTopics.filter(st => st.id !== id) });
    } else if (type === 'user') {
      deleteUser(id);
      setSelectedUserId(null);
      setIsCreatingUser(false);
    }
    closeModal();
    setDeleteData(null);
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleCreateUser = () => {
    setIsCreatingUser(true);
    setSelectedUserId(null);
    setShowUserPassword(false);
    setSuccessMessage(null);
    setUserForm({
      name: '', email: '', password: 'password', role: UserRole.STUDENT, active: true, 
      linkedUserIds: [], avatar: `https://picsum.photos/200/200?random=${Date.now()}`
    });
    setActiveUserTab('profile');
  };

  const handleSelectUser = (user: User) => {
    setIsCreatingUser(false);
    setSelectedUserId(user.id);
    setShowUserPassword(false);
    setSuccessMessage(null);
    setUserForm({ ...user });
    setActiveUserTab('profile');
  };

  const handleSaveUser = () => {
    if (!userForm.name || !userForm.role) return;
    
    const isNew = !selectedUserId;
    const finalUser = {
      ...userForm,
      id: selectedUserId || `u-${Date.now()}`,
      createdAt: userForm.createdAt || new Date().toISOString().split('T')[0]
    } as User;

    if (isNew) addUser(finalUser);
    else updateUser(finalUser);

    // Sync Relationships Bi-directionally
    if (finalUser.linkedUserIds) {
      finalUser.linkedUserIds.forEach(linkedId => {
         const linkedUser = getUser(linkedId);
         if (linkedUser && (!linkedUser.linkedUserIds || !linkedUser.linkedUserIds.includes(finalUser.id))) {
           updateUser({
             ...linkedUser,
             linkedUserIds: [...(linkedUser.linkedUserIds || []), finalUser.id]
           });
         }
      });
    }

    setIsCreatingUser(false);
    setSelectedUserId(finalUser.id);
    setSuccessMessage("User saved successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleLinkUser = (targetId: string) => {
    if (!userForm.linkedUserIds?.includes(targetId)) {
      setUserForm({ ...userForm, linkedUserIds: [...(userForm.linkedUserIds || []), targetId] });
    }
  };

  const handleUnlinkUser = (targetId: string) => {
     setUserForm({ ...userForm, linkedUserIds: userForm.linkedUserIds?.filter(id => id !== targetId) });
  };

  // --- AI HANDLERS (Same as before) ---
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !selectedSubject) return;
    setAiStep(2); setAiError(null);
    try {
      const results = await generateCurriculum(selectedSubject.name, aiPrompt);
      if (results) { setAiResults(results); setAiStep(3); setAiExpandedReview(new Set([0])); }
      else { setAiError("We couldn't generate topics. Please try a different description."); setAiStep(1); }
    } catch (e) { setAiError("Something went wrong. Please check your connection."); setAiStep(1); }
  };

  const handleAiImport = () => {
    if (!selectedSubjectId) return;
    const selected = aiResults.filter(t => t.isSelected);
    selected.forEach((aiTopic, idx) => {
      addTopic({
        id: `t-ai-${Date.now()}-${idx}`, subjectId: selectedSubjectId, name: aiTopic.name, description: aiTopic.description,
        difficulty: (aiTopic.difficulty as DifficultyLevel) || DifficultyLevel.MEDIUM, recommendedYear: aiTopic.recommendedYear || 'Year 5',
        tags: ['AI Generated'], order: subjectTopics.length + idx,
        subTopics: aiTopic.subTopics.map((st, sIdx) => ({
          id: `st-ai-${Date.now()}-${idx}-${sIdx}`, name: st.name, explanation: st.explanation, learningObjective: st.learningObjective,
          exampleQuestions: st.exampleQuestions, difficulty: (st.difficulty as DifficultyLevel) || DifficultyLevel.MEDIUM, order: sIdx
        }))
      });
    });
    closeModal();
  };
  
  const updateAiResultTopic = (index: number, field: string, value: string) => {
    const newResults = [...aiResults]; newResults[index] = { ...newResults[index], [field]: value }; setAiResults(newResults);
  };
  const updateAiResultSubTopic = (tIndex: number, stIndex: number, field: string, value: string) => {
    const newResults = [...aiResults]; const newSub = [...newResults[tIndex].subTopics]; newSub[stIndex] = { ...newSub[stIndex], [field]: value };
    newResults[tIndex] = { ...newResults[tIndex], subTopics: newSub }; setAiResults(newResults);
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      {/* 1. TOP HEADER */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-sm z-10 sticky top-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <Layout className="w-6 h-6 text-indigo-600" /> Admin Console
          </h1>
          <p className="text-sm text-gray-500 hidden sm:block">Manage curriculum content and users.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setActiveView('subjects')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'subjects' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Subjects & Topics</button>
          <button onClick={() => setActiveView('users')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>User Management</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        
        {/* VIEW: SUBJECTS & TOPICS (Existing Code Logic) */}
        {activeView === 'subjects' && (
          <div className="flex h-full">
            <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
              <div className="p-5">
                <div className="flex justify-between items-center mb-4"><h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subjects</h2><button onClick={() => openModal('subject')} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition"><Plus className="w-4 h-4" /></button></div>
                <div className="space-y-2">
                  {subjects.map(subject => (
                    <div key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${selectedSubjectId === subject.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}>
                      <div className="flex items-center gap-3"><div className={`p-2 rounded-lg text-white ${subject.color} shadow-sm`}>{getIconComponent(subject.icon)}</div><span className={`font-bold text-sm ${selectedSubjectId === subject.id ? 'text-indigo-900' : 'text-gray-600'}`}>{subject.name}</span></div>
                      <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${selectedSubjectId === subject.id ? 'opacity-100' : ''}`}>
                         <button onClick={(e) => { e.stopPropagation(); openModal('subject', subject.id); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-md"><Edit2 className="w-3 h-3" /></button>
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteClick('subject', subject.id, subject.name); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-md"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  {subjects.length === 0 && <div className="text-center p-4 text-gray-400 text-sm">No subjects yet. Add one!</div>}
                </div>
              </div>
            </aside>
            <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-10">
              {selectedSubject ? (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div><h2 className="text-3xl font-display font-bold text-gray-900 mb-2">{selectedSubject.name} Curriculum</h2><p className="text-gray-500">{selectedSubject.description}</p></div>
                    <div className="flex gap-3">
                       <button onClick={() => openModal('topic')} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-300 transition flex items-center gap-2"><Plus className="w-4 h-4" /> New Topic</button>
                       <button onClick={() => openModal('ai')} className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg shadow-fuchsia-200 hover:shadow-fuchsia-300 hover:-translate-y-0.5 transition flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-200" /> AI Wizard</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {subjectTopics.length === 0 && <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center"><div className="w-20 h-20 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4"><Layers className="w-10 h-10" /></div><h3 className="text-xl font-bold text-gray-800 mb-2">No Topics Added</h3><p className="text-gray-500 mb-6">Start building the curriculum manually or use the AI Wizard.</p><button onClick={() => openModal('ai')} className="text-indigo-600 font-bold hover:underline">Launch AI Wizard</button></div>}
                    {subjectTopics.map((topic, index) => {
                       const isExpanded = expandedTopicIds.has(topic.id);
                       return (
                         <div key={topic.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                           <div onClick={() => { const newSet = new Set(expandedTopicIds); if(newSet.has(topic.id)) newSet.delete(topic.id); else newSet.add(topic.id); setExpandedTopicIds(newSet); }} className="p-5 flex items-center justify-between cursor-pointer bg-white hover:bg-gray-50 transition select-none">
                              <div className="flex items-center gap-4">
                                 <div className={`p-2 rounded-lg bg-gray-100 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-indigo-500 bg-indigo-50' : ''}`}><ChevronRight className="w-5 h-5" /></div>
                                 <div><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">{topic.name}<span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide ${topic.difficulty === DifficultyLevel.EASY ? 'bg-green-50 text-green-700 border-green-200' : topic.difficulty === DifficultyLevel.HARD ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{topic.difficulty}</span></h3><p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2"><span>{topic.subTopics.length} Subtopics</span><span className="w-1 h-1 bg-gray-300 rounded-full"></span><span>{topic.recommendedYear}</span></p></div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button onClick={(e) => { e.stopPropagation(); openModal('topic', topic.id); }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                                 <button onClick={(e) => { e.stopPropagation(); handleDeleteClick('topic', topic.id, topic.name); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                           {isExpanded && (
                             <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                               {topic.subTopics.map((sub, sIdx) => (
                                 <div key={sub.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-start justify-between group hover:border-indigo-200 transition">
                                    <div className="flex gap-4"><div className="mt-1 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{sIdx + 1}</div><div><h4 className="font-bold text-gray-800 text-sm">{sub.name}</h4><p className="text-xs text-gray-500 mt-1 line-clamp-1">{sub.explanation}</p></div></div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => openModal('subtopic', sub.id, topic.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50"><Edit2 className="w-3 h-3"/></button>
                                       <button onClick={() => handleDeleteClick('subtopic', sub.id, sub.name, topic.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                 </div>
                               ))}
                               <button onClick={() => openModal('subtopic', null, topic.id)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white transition flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Subtopic</button>
                             </div>
                           )}
                         </div>
                       );
                    })}
                  </div>
                </div>
              ) : <div className="h-full flex flex-col items-center justify-center text-gray-400"><BookOpen className="w-16 h-16 text-gray-200 mb-4" /><p>Select a subject from the sidebar to manage content.</p></div>}
            </main>
          </div>
        )}

        {/* VIEW: USER MANAGEMENT */}
        {activeView === 'users' && (
          <div className="flex h-full">
            {/* LEFT SIDEBAR: USER LIST */}
            <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl mb-3">
                   <Search className="w-4 h-4 text-gray-400 ml-1" />
                   <input 
                     value={userSearchTerm}
                     onChange={(e) => setUserSearchTerm(e.target.value)}
                     placeholder="Search users..." 
                     className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
                   />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {['ALL', UserRole.STUDENT, UserRole.PARENT, UserRole.ADMIN].map(role => (
                     <button 
                       key={role}
                       onClick={() => setUserRoleFilter(role)}
                       className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition ${userRoleFilter === role ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                     >
                       {role === 'ALL' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
                     </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                 <button 
                   onClick={handleCreateUser}
                   className="w-[calc(100%-24px)] mx-3 mt-3 mb-2 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition"
                 >
                   <UserPlus className="w-4 h-4" /> Add New User
                 </button>
                 
                 <div className="space-y-1 p-3 pt-0">
                   {filteredUsers.map(u => (
                     <div 
                       key={u.id}
                       onClick={() => handleSelectUser(u)}
                       className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition ${selectedUserId === u.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-gray-50'}`}
                     >
                       <img src={u.avatar} className="w-10 h-10 rounded-full border border-gray-200" alt="" />
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between">
                            <h4 className={`font-bold text-sm truncate ${selectedUserId === u.id ? 'text-indigo-900' : 'text-gray-800'}`}>{u.name}</h4>
                            {!u.active && <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5"></span>}
                         </div>
                         <p className="text-xs text-gray-500 truncate">{u.role} • {u.email || 'No email'}</p>
                       </div>
                     </div>
                   ))}
                   {filteredUsers.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No users found.</p>}
                 </div>
              </div>
            </aside>

            {/* RIGHT PANEL: USER EDITOR */}
            <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-12">
               {(selectedUserId || isCreatingUser) ? (
                 <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* Header */}
                    <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-white">
                       <div className="flex gap-6 items-center">
                          <img src={userForm.avatar} className="w-20 h-20 rounded-full border-4 border-gray-50 shadow-sm" alt="" />
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{isCreatingUser ? 'Create User' : userForm.name}</h2>
                            <p className="text-gray-500 text-sm flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${userForm.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : userForm.role === UserRole.PARENT ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {userForm.role}
                              </span>
                              {userForm.email}
                            </p>
                          </div>
                       </div>
                       {!isCreatingUser && (
                         <button onClick={() => handleDeleteClick('user', selectedUserId!, userForm.name || '')} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
                           <Trash2 className="w-5 h-5" />
                         </button>
                       )}
                    </div>
                    
                    {/* Success Message Banner */}
                    {successMessage && (
                      <div className="mx-8 mt-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 flex items-center gap-2 animate-in slide-in-from-top-2 font-bold text-sm">
                        <Check className="w-4 h-4" />
                        {successMessage}
                      </div>
                    )}

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 px-8">
                       {[
                         {id: 'profile', label: 'Profile Details', icon: <Users className="w-4 h-4"/>},
                         {id: 'security', label: 'Security', icon: <Shield className="w-4 h-4"/>},
                         {id: 'family', label: 'Family Connections', icon: <Link className="w-4 h-4"/>}
                       ].map(tab => (
                         <button 
                           key={tab.id}
                           onClick={() => setActiveUserTab(tab.id as any)}
                           className={`py-4 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeUserTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                         >
                           {tab.icon} {tab.label}
                         </button>
                       ))}
                    </div>

                    {/* Content */}
                    <div className="p-8">
                       
                       {/* 1. PROFILE TAB */}
                       {activeUserTab === 'profile' && (
                         <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                               <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                 <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-900" 
                                   value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                               </div>
                               <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                                 <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-900"
                                   value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}>
                                   <option value={UserRole.STUDENT}>Student</option>
                                   <option value={UserRole.PARENT}>Parent</option>
                                   <option value={UserRole.ADMIN}>Admin</option>
                                 </select>
                               </div>
                            </div>
                            
                            <div>
                               <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                               <div className="relative">
                                 <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                 <input className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-900" 
                                   value={userForm.email || ''} onChange={e => setUserForm({...userForm, email: e.target.value})} type="email" />
                               </div>
                            </div>

                            {userForm.role === UserRole.PARENT && (
                              <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                                 <div className="relative">
                                   <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                   <input className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-900" 
                                     value={userForm.phone || ''} onChange={e => setUserForm({...userForm, phone: e.target.value})} placeholder="+44 7700 900000" />
                                 </div>
                              </div>
                            )}

                            {userForm.role === UserRole.STUDENT && (
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Year Group</label>
                                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-900"
                                      value={userForm.grade || 'Year 5'} onChange={e => setUserForm({...userForm, grade: e.target.value})}>
                                      <option value="Year 4">Year 4</option>
                                      <option value="Year 5">Year 5</option>
                                      <option value="Year 6">Year 6</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">School</label>
                                    <div className="relative">
                                       <School className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                       <input className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-900" 
                                         value={userForm.school || ''} onChange={e => setUserForm({...userForm, school: e.target.value})} />
                                    </div>
                                 </div>
                              </div>
                            )}
                         </div>
                       )}

                       {/* 2. SECURITY TAB */}
                       {activeUserTab === 'security' && (
                         <div className="space-y-8">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
                               <div>
                                 <h4 className="font-bold text-gray-900">Account Status</h4>
                                 <p className="text-sm text-gray-500">Inactive users cannot log in.</p>
                               </div>
                               <button 
                                 onClick={() => setUserForm({...userForm, active: !userForm.active})}
                                 className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${userForm.active ? 'bg-green-500' : 'bg-gray-300'}`}
                               >
                                 <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${userForm.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                               </button>
                            </div>

                            <div>
                               <h4 className="font-bold text-gray-900 mb-4">Password Management</h4>
                               <div className="grid grid-cols-2 gap-4">
                                  <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition text-left group">
                                    <Mail className="w-5 h-5 text-gray-400 mb-2 group-hover:text-indigo-600 transition" />
                                    <span className="block font-bold text-gray-700">Send Reset Email</span>
                                    <span className="text-xs text-gray-400">User sets their own password</span>
                                  </button>
                                  <div className="relative">
                                    <input 
                                      type={showUserPassword ? "text" : "password"}
                                      placeholder="Set Manual Password"
                                      value={userForm.password || ''}
                                      onChange={e => setUserForm({...userForm, password: e.target.value})}
                                      className="w-full h-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white text-gray-900 pr-12"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => setShowUserPassword(!showUserPassword)}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2"
                                    >
                                      {showUserPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                  </div>
                               </div>
                            </div>
                         </div>
                       )}

                       {/* 3. FAMILY TAB */}
                       {activeUserTab === 'family' && (
                         <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                               <div className={`p-2 rounded-lg ${userForm.role === UserRole.STUDENT ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                                 <Link className="w-5 h-5" />
                               </div>
                               <div>
                                 <h4 className="font-bold text-gray-900">{userForm.role === UserRole.STUDENT ? 'Parents' : 'Children'}</h4>
                                 <p className="text-sm text-gray-500">Linked accounts can view progress.</p>
                               </div>
                            </div>
                            
                            {/* List Linked Users */}
                            <div className="space-y-2">
                               {userForm.linkedUserIds?.map(linkedId => {
                                 const linkedUser = getUser(linkedId);
                                 if (!linkedUser) return null;
                                 return (
                                   <div key={linkedId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                      <div className="flex items-center gap-3">
                                         <img src={linkedUser.avatar} className="w-8 h-8 rounded-full" alt=""/>
                                         <div>
                                           <p className="text-sm font-bold text-gray-800">{linkedUser.name}</p>
                                           <p className="text-xs text-gray-500">{linkedUser.email}</p>
                                         </div>
                                      </div>
                                      <button onClick={() => handleUnlinkUser(linkedId)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition"><X className="w-4 h-4"/></button>
                                   </div>
                                 )
                               })}
                               {(!userForm.linkedUserIds || userForm.linkedUserIds.length === 0) && (
                                 <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 text-sm">
                                   No family members linked yet.
                                 </div>
                               )}
                            </div>

                            {/* Add Link Section */}
                            <div className="relative mt-4">
                               <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                               <input 
                                 placeholder={`Search for ${userForm.role === UserRole.STUDENT ? 'a parent' : 'a student'}...`}
                                 className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                                 value={familySearchTerm}
                                 onChange={e => setFamilySearchTerm(e.target.value)}
                               />
                               {familySearchTerm && (
                                 <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 max-h-48 overflow-y-auto">
                                    {users
                                      .filter(u => u.role !== userForm.role && u.role !== UserRole.ADMIN) // Only show opposite role
                                      .filter(u => u.name.toLowerCase().includes(familySearchTerm.toLowerCase()))
                                      .map(u => (
                                        <button 
                                          key={u.id}
                                          onClick={() => { handleLinkUser(u.id); setFamilySearchTerm(''); }}
                                          className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 transition"
                                        >
                                           <img src={u.avatar} className="w-6 h-6 rounded-full" alt=""/>
                                           <span className="text-sm font-bold text-gray-700">{u.name}</span>
                                           <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 ml-auto">{u.role}</span>
                                        </button>
                                    ))}
                                 </div>
                               )}
                            </div>
                         </div>
                       )}

                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                       <button onClick={() => { setIsCreatingUser(false); setSelectedUserId(null); }} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                       <button onClick={handleSaveUser} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition flex items-center gap-2">
                         <Check className="w-5 h-5" /> Save User
                       </button>
                    </div>

                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Users className="w-16 h-16 text-gray-200 mb-4" />
                    <h3 className="text-xl font-bold text-gray-600 mb-2">Select a User</h3>
                    <p>Click on a user from the list to edit details.</p>
                 </div>
               )}
            </main>
          </div>
        )}

      </div>

      {/* MODALS RENDERED AS BEFORE */}
      {modalType === 'subject' && (
        <ModalWrapper title={editId ? 'Edit Subject' : 'New Subject'} onClose={closeModal}>
          <div className="space-y-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Subject Name</label>
               <input 
                 value={subjectForm.name || ''} 
                 onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}
                 className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                 placeholder="e.g. Mathematics"
                 autoFocus
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
               <textarea 
                 value={subjectForm.description || ''} 
                 onChange={e => setSubjectForm({...subjectForm, description: e.target.value})}
                 className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
               />
             </div>
             <div className="flex justify-end gap-3 mt-6">
               <button onClick={closeModal} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancel</button>
               <button onClick={handleSaveSubject} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-md">Save Subject</button>
             </div>
          </div>
        </ModalWrapper>
      )}

      {modalType === 'topic' && (
        <ModalWrapper title={editId ? 'Edit Topic' : 'New Topic'} onClose={closeModal}>
          <div className="space-y-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Topic Name</label>
               <input 
                 value={topicForm.name || ''} 
                 onChange={e => setTopicForm({...topicForm, name: e.target.value})}
                 className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="e.g. Fractions"
                 autoFocus
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                  <select 
                    value={topicForm.difficulty} 
                    onChange={e => setTopicForm({...topicForm, difficulty: e.target.value as DifficultyLevel})}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Year Group</label>
                  <select 
                    value={topicForm.recommendedYear} 
                    onChange={e => setTopicForm({...topicForm, recommendedYear: e.target.value})}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="Year 4">Year 4</option><option value="Year 5">Year 5</option><option value="Year 6">Year 6</option>
                  </select>
               </div>
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
               <textarea 
                 value={topicForm.description || ''} 
                 onChange={e => setTopicForm({...topicForm, description: e.target.value})}
                 className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
               />
             </div>
             <div className="flex justify-end gap-3 mt-6">
               <button onClick={closeModal} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancel</button>
               <button onClick={handleSaveTopic} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-md">Save Topic</button>
             </div>
          </div>
        </ModalWrapper>
      )}

      {modalType === 'subtopic' && (
        <ModalWrapper title={editId ? 'Edit Subtopic' : 'New Subtopic'} onClose={closeModal}>
          <div className="space-y-5">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Subtopic Name</label>
               <input 
                 value={subTopicForm.name || ''} 
                 onChange={e => setSubTopicForm({...subTopicForm, name: e.target.value})}
                 className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="e.g. Simplifying Fractions"
                 autoFocus
               />
             </div>
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
               <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wide mb-2">
                 Student Explanation (Kid Friendly)
               </label>
               <textarea 
                 value={subTopicForm.explanation || ''} 
                 onChange={e => setSubTopicForm({...subTopicForm, explanation: e.target.value})}
                 className="w-full p-3 bg-white text-gray-900 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none text-sm"
                 placeholder="Explain it simply..."
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Learning Objective</label>
               <input 
                 value={subTopicForm.learningObjective || ''} 
                 onChange={e => setSubTopicForm({...subTopicForm, learningObjective: e.target.value})}
                 className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none text-sm"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Example Question</label>
               <input 
                 value={subTopicForm.exampleQuestions?.[0] || ''} 
                 onChange={e => setSubTopicForm({...subTopicForm, exampleQuestions: [e.target.value]})}
                 className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none font-mono text-sm"
               />
             </div>
             <div className="flex justify-end gap-3 mt-6">
               <button onClick={closeModal} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancel</button>
               <button onClick={handleSaveSubTopic} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-md">Save Subtopic</button>
             </div>
          </div>
        </ModalWrapper>
      )}

      {/* AI Wizard & Delete Modal Logic reused from before */}
       {modalType === 'ai' && (
        <ModalWrapper title="Curriculum Wizard" maxWidth="max-w-4xl" onClose={closeModal}>
          <div className="min-h-[60vh] flex flex-col">
            <div className="flex justify-center mb-8">
               <div className="flex items-center gap-4">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${aiStep >= 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                 <div className={`w-16 h-1 bg-gray-200 rounded-full overflow-hidden`}><div className={`h-full bg-violet-600 transition-all ${aiStep >= 2 ? 'w-full' : 'w-0'}`}></div></div>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${aiStep >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                 <div className={`w-16 h-1 bg-gray-200 rounded-full overflow-hidden`}><div className={`h-full bg-violet-600 transition-all ${aiStep >= 3 ? 'w-full' : 'w-0'}`}></div></div>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${aiStep >= 3 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
               </div>
            </div>

            {aiStep === 1 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                 <div className="bg-violet-50 p-4 rounded-full text-violet-500 mb-2"><Wand2 className="w-12 h-12" /></div>
                 <h2 className="text-3xl font-display font-bold text-gray-900">What shall we teach?</h2>
                 <p className="text-gray-500 text-lg">Describe the topic, year group, and focus area. The AI will structure it for you.</p>
                 <div className="w-full relative">
                   <textarea 
                     value={aiPrompt}
                     onChange={(e) => setAiPrompt(e.target.value)}
                     className="w-full p-6 bg-white text-gray-900 border-2 border-violet-100 rounded-3xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none text-xl resize-none shadow-sm transition"
                     placeholder="e.g. Fractions for Year 5, focusing on equivalent fractions and simplifying..."
                     rows={4}
                     autoFocus
                   />
                   {aiError && <div className="absolute -bottom-12 left-0 right-0 text-red-500 text-sm font-bold flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4"/> {aiError}</div>}
                 </div>
                 <button onClick={handleAiGenerate} disabled={!aiPrompt.trim()} className="mt-4 px-10 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xl font-bold rounded-2xl shadow-xl shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-1 transition disabled:opacity-50 disabled:transform-none">Generate Curriculum</button>
              </div>
            )}
            {aiStep === 2 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                 <div className="relative"><div className="w-24 h-24 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-8 h-8 text-fuchsia-500 animate-pulse" /></div></div>
                 <div><h3 className="text-2xl font-bold text-gray-800">Designing the structure...</h3><p className="text-gray-500 mt-2">Creating topics, subtopics, and examples.</p></div>
              </div>
            )}
            {aiStep === 3 && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-800">Review & Import</h3><div className="flex gap-3"><button onClick={() => setAiStep(1)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Back</button><button onClick={handleAiImport} className="px-6 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700 shadow-md flex items-center gap-2"><Check className="w-4 h-4" /> Import Selected</button></div></div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                   {aiResults.map((topic, idx) => {
                     const isExpanded = aiExpandedReview.has(idx);
                     return (
                       <div key={idx} className={`bg-white border rounded-2xl transition-all ${topic.isSelected ? 'border-violet-200 shadow-sm' : 'border-gray-100 opacity-60'}`}>
                          <div className="p-4 flex items-start gap-4 bg-gray-50">
                             <input type="checkbox" checked={topic.isSelected} onChange={() => { const newResults = [...aiResults]; newResults[idx].isSelected = !newResults[idx].isSelected; setAiResults(newResults); }} className="mt-1.5 w-5 h-5 text-violet-600 rounded border-gray-300 focus:ring-violet-500 bg-white"/>
                             <div className="flex-1"><div className="flex gap-4 mb-2"><input value={topic.name} onChange={e => updateAiResultTopic(idx, 'name', e.target.value)} className="font-bold text-lg bg-transparent border-b border-transparent focus:border-violet-300 outline-none hover:border-gray-300 w-full text-gray-900"/></div><input value={topic.description} onChange={e => updateAiResultTopic(idx, 'description', e.target.value)} className="text-sm text-gray-600 bg-transparent border-b border-transparent focus:border-violet-300 outline-none w-full"/></div>
                             <button onClick={() => { const newSet = new Set(aiExpandedReview); if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx); setAiExpandedReview(newSet); }} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400">{isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</button>
                          </div>
                          {isExpanded && (
                            <div className="p-4 border-t border-gray-100 space-y-4">
                               {topic.subTopics.map((st, sIdx) => (
                                 <div key={sIdx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between mb-2"><input value={st.name} onChange={e => updateAiResultSubTopic(idx, sIdx, 'name', e.target.value)} className="font-bold text-sm bg-transparent border-b border-transparent focus:border-violet-300 outline-none text-gray-900"/><span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{st.difficulty}</span></div>
                                    <textarea value={st.explanation} onChange={e => updateAiResultSubTopic(idx, sIdx, 'explanation', e.target.value)} className="w-full text-xs text-gray-600 bg-gray-50 p-2 rounded border-transparent focus:border-violet-300 outline-none resize-none h-16"/>
                                 </div>
                               ))}
                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>
              </div>
            )}
          </div>
        </ModalWrapper>
      )}

      {modalType === 'delete' && deleteData && (
        <div 
          className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={() => setModalType(null)}
        >
           <div 
             className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 relative"
             onClick={(e) => e.stopPropagation()}
           >
              <button onClick={() => setModalType(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition"><X className="w-5 h-5" /></button>
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete {deleteData.type}?</h3>
              <p className="text-gray-500 mb-8">Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteData.name}"</span>? This cannot be undone.</p>
              <div className="flex gap-3"><button onClick={() => setModalType(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Cancel</button><button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-200">Yes, Delete</button></div>
           </div>
        </div>
      )}

    </div>
  );
};
