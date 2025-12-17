
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, Subject, Topic, Test, StudyPlan, UserRole, TaskStatus, Reward, DifficultyLevel, SubTopic, Gender, PointRule, RewardRequest, PointTransaction, PointCategory, TestType, QuestionBankItem } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TOPICS, INITIAL_REWARDS, INITIAL_POINT_RULES } from '../constants';
import { supabase } from '../lib/supabase';

// Supabase internal types
type SupabaseUser = any;

interface AddUserResponse {
  success: boolean;
  message: string;
  requiresConfirmation?: boolean;
}

interface AppContextType {
  currentUser: User | null;
  viewRole: UserRole | null;
  setViewRole: (role: UserRole) => void;
  isLoading: boolean;
  dbError: string | null;
  login: (email: string, pass: string) => Promise<string | null>;
  signup: (email: string, pass: string, name: string, role: UserRole, gender?: Gender) => Promise<string | null>;
  logout: () => void;
  users: User[];
  subjects: Subject[];
  topics: Topic[];
  tests: Test[];
  plans: StudyPlan[];
  rewards: Reward[];
  pointRules: PointRule[];
  rewardRequests: RewardRequest[];
  pointTransactions: PointTransaction[];
  questionBank: QuestionBankItem[];
  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => Promise<void>;
  addTopic: (topic: Topic, shouldRefresh?: boolean) => Promise<{ error: any }>;
  updateTopic: (topic: Topic) => void;
  deleteTopic: (id: string) => Promise<void>;
  addSubTopic: (subTopic: SubTopic, topicId: string) => Promise<void>;
  updateSubTopic: (subTopic: SubTopic) => Promise<void>;
  deleteSubTopic: (id: string) => Promise<void>;
  addUser: (user: Partial<User> & { password?: string }) => Promise<AddUserResponse>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getUser: (id: string) => User | undefined;
  addPlan: (plan: StudyPlan) => Promise<void>;
  updatePlan: (plan: StudyPlan) => void;
  deletePlan: (id: string) => Promise<void>;
  markPlanComplete: (planId: string) => void;
  addTest: (test: Test) => Promise<void>;
  updateTest: (test: Test) => void;
  deleteTest: (id: string) => Promise<void>;
  completeTest: (testId: string, score: number, answers: number[], timeTaken?: number) => void;
  redeemReward: (rewardId: string, cost: number) => boolean;
  addReward: (reward: Reward) => void;
  deleteReward: (id: string) => void;
  updateReward: (reward: Reward) => void;
  updatePointRule: (rule: PointRule) => void;
  requestReward: (reward: Reward, studentId: string) => void;
  approveRewardRequest: (requestId: string) => void;
  rejectRewardRequest: (requestId: string) => void;
  fulfillRewardRequest: (requestId: string) => void;
  addManualPoints: (studentId: string, amount: number, description: string) => void;
  seedDatabase: () => Promise<void>;
  switchUser: (role: UserRole) => void;
  refreshData: () => Promise<void>;
  calculatePoints: (category: PointCategory, scorePercentage?: number) => { points: number, breakdown: string[] };
  aiGlobalBehavior: string;
  updateAiGlobalBehavior: (behavior: string) => void;
  addQuestionToBank: (q: Partial<QuestionBankItem>) => Promise<void>;
  deleteQuestionFromBank: (id: string) => Promise<void>;
  uploadQuestionsBulk: (csvText: string) => Promise<{success: number, failed: number, errors: string[]}>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- UTILS ---
const normalizeDifficulty = (diff: string | undefined): DifficultyLevel => {
  if (!diff) return DifficultyLevel.MEDIUM;
  const d = diff.toLowerCase();
  if (d.includes('easy')) return DifficultyLevel.EASY;
  if (d.includes('hard')) return DifficultyLevel.HARD;
  if (d.includes('mixed')) return DifficultyLevel.MIXED;
  return DifficultyLevel.MEDIUM;
};

const normalizeRole = (roleStr: string): UserRole => {
  if (!roleStr) return UserRole.STUDENT;
  const r = roleStr.toUpperCase();
  if (r === 'ADMIN') return UserRole.ADMIN;
  if (r === 'PARENT') return UserRole.PARENT;
  if (r === 'TEACHER') return UserRole.TEACHER;
  return UserRole.STUDENT;
};

const normalizeGender = (genderStr: string | null | undefined): Gender | undefined => {
  if (!genderStr) return undefined;
  const g = genderStr.toLowerCase();
  if (g === 'boy') return Gender.BOY;
  if (g === 'girl') return Gender.GIRL;
  return undefined;
};

export const AppProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewRole, setViewRoleState] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [aiGlobalBehavior, setAiGlobalBehavior] = useState<string>(() => {
    return localStorage.getItem('ai_behavior') || "You are a friendly, patient, and encouraging tutor for 11+ students (aged 9-11). Use simple language, be positive, and focus on helping them understand concepts clearly.";
  });
  const [pointRules, setPointRules] = useState<PointRule[]>(INITIAL_POINT_RULES);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = currentUser?.id || null;
  }, [currentUser]);

  // Handle Session Initialization
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user && mounted) {
          await fetchProfile(session.user.id, session.user);
        }
      } catch (err: any) {
        console.warn("Supabase Auth Initialization Failed:", err.message);
        if (err.message.includes('fetch')) {
           setDbError("Network connection to authentication server failed. Please check your internet.");
        }
      } finally {
        if (mounted) {
           setIsLoading(false);
           refreshData();
        }
      }
    };

    initializeAuth();

    const { data: authListener } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
      if (!mounted) return;
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        if (userIdRef.current !== session.user.id) {
           await fetchProfile(session.user.id, session.user);
           refreshData();
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setViewRoleState(null);
        setUsers([]); 
        userIdRef.current = null;
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, userObject?: SupabaseUser): Promise<string | null> => {
    try {
      // Use .maybeSingle() instead of .single() to avoid throwing errors if not found
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (error) {
         if (error.message.includes('fetch')) throw new Error("Failed to reach database server.");
         console.warn("Profile fetch error:", error.message);
      }

      if (data) {
        const user: User = {
          id: data.id,
          name: data.name,
          role: normalizeRole(data.role),
          email: data.email,
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${data.name}&background=random`,
          active: data.active,
          coins: data.coins,
          inventory: data.inventory || [],
          linkedUserIds: data.linked_user_ids || [],
          grade: data.grade,
          school: data.school,
          phone: data.phone,
          gender: normalizeGender(data.gender)
        };
        setCurrentUser(user);
        userIdRef.current = user.id; 
        setViewRoleState(user.role);
        return null;
      }

      // If no profile found, try to create one or use auth metadata
      let authUser = userObject;
      if (!authUser) {
          const { data: fetched } = await (supabase.auth as any).getUser();
          authUser = fetched.user || undefined;
      }

      if (!authUser) return "Session authentication data is missing.";

      const baseData = {
        id: userId,
        email: authUser.email,
        name: authUser.user_metadata.name || 'User',
        role: normalizeRole(authUser.user_metadata.role || 'STUDENT'),
        active: true,
        avatar: `https://ui-avatars.com/api/?name=${authUser.user_metadata.name || 'User'}&background=random`,
        coins: 0,
        inventory: [],
        linked_user_ids: [],
        grade: authUser.user_metadata.grade || null,
        school: authUser.user_metadata.school || null,
        phone: authUser.user_metadata.phone || null,
        gender: normalizeGender(authUser.user_metadata.gender) || null,
      };

      // Attempt profile insertion, ignore unique constraint errors
      const { error: insertError } = await supabase.from('profiles').insert(baseData);
      
      if (insertError && insertError.code !== '23505') {
         console.warn("Could not persist profile to DB (likely RLS or missing table):", insertError.message);
      }

      const memoryUser: User = { ...baseData, linkedUserIds: [] };
      setCurrentUser(memoryUser);
      userIdRef.current = userId;
      setViewRoleState(memoryUser.role);
      return null;

    } catch (e: any) {
      console.error("Critical fetchProfile error:", e);
      return e.message || "An unexpected error occurred while loading your profile.";
    }
  };

  const refreshData = async () => {
    try {
      const subjectsRes = await supabase.from('subjects').select('*').order('order');
      if (subjectsRes.error) {
         if (subjectsRes.error.code === '42P01') setDbError("Database tables are missing. Please run the SQL setup script.");
      } else if (subjectsRes.data) {
         setSubjects(subjectsRes.data);
      }

      const topicsRes = await supabase.from('topics').select('*, sub_topics(*)').order('order');
      if (topicsRes.data) {
        const formattedTopics = topicsRes.data.map((topic: any) => ({
          ...topic,
          subjectId: topic.subject_id,
          recommendedYear: topic.recommended_year,
          subTopics: topic.sub_topics?.map((st: any) => ({
            ...st,
            learningObjective: st.learning_objective,
            exampleQuestions: st.example_questions,
            topicId: st.topic_id
          })).sort((a: any, b: any) => a.order - b.order) || []
        }));
        setTopics(formattedTopics);
      }

      if (!userIdRef.current) return;

      const results = await Promise.allSettled([
        supabase.from('profiles').select('*'),
        supabase.from('tests').select('*'),
        supabase.from('study_plans').select('*'),
        supabase.from('rewards').select('*'),
        supabase.from('reward_requests').select('*').order('request_date', { ascending: false }),
        supabase.from('point_transactions').select('*').order('date', { ascending: false }),
        supabase.from('question_bank').select('*').limit(500)
      ]);

      const [profilesRes, testsRes, plansRes, rewardsRes, requestsRes, transactionsRes, questionsRes] = results;

      if (profilesRes.status === 'fulfilled' && profilesRes.value.data) {
        setUsers(profilesRes.value.data.map((d:any) => ({
          ...d, 
          linkedUserIds: d.linked_user_ids || [], 
          role: normalizeRole(d.role),
          avatar: d.avatar || `https://ui-avatars.com/api/?name=${d.name}&background=random`,
          gender: normalizeGender(d.gender)
        })));
      }

      if (questionsRes.status === 'fulfilled' && questionsRes.value.data) {
        setQuestionBank(questionsRes.value.data.map((q: any) => ({
          id: q.id,
          topicId: q.topic_id,
          text: q.text,
          options: q.options || [],
          correctAnswerIndex: q.correct_answer_index,
          explanation: q.explanation,
          difficulty: normalizeDifficulty(q.difficulty),
          usageCount: q.usage_count,
          tags: q.tags,
          source: 'BANK'
        })));
      }

      if (testsRes.status === 'fulfilled' && testsRes.value.data) {
        setTests(testsRes.value.data.map((d: any) => ({
          ...d,
          subjectId: d.subject_id,
          topicIds: d.topic_ids || (d.topic_id ? [d.topic_id] : []),
          subTopicIds: d.sub_topic_ids,
          assignedTo: d.assigned_to,
          createdBy: d.created_by,
          assignedDate: d.assigned_date,
          duration: d.duration,
          questions: d.questions,
          status: d.status,
          score: d.score,
          completed: d.completed,
          studentAnswers: d.student_answers,
          timeTaken: d.time_taken,
          analysis: d.analysis
        })));
      }

      if (plansRes.status === 'fulfilled' && plansRes.value.data) {
        setPlans(plansRes.value.data.map((d: any) => ({
          ...d,
          parentId: d.parent_id,
          studentId: d.student_id,
          subjectId: d.subject_id,
          topicId: d.topic_id,
          subTopicIds: d.sub_topic_ids || []
        })));
      }

      if (rewardsRes.status === 'fulfilled' && rewardsRes.value.data) {
        setRewards(rewardsRes.value.data.map((d: any) => ({
          ...d,
          parentId: d.parent_id,
          approvalRequired: d.description?.startsWith('::REQ::') || !!d.approval_required,
          description: d.description?.startsWith('::REQ::') ? d.description.substring(7) : d.description
        })));
      }

      if (requestsRes.status === 'fulfilled' && requestsRes.value.data) {
        setRewardRequests(requestsRes.value.data.map((r: any) => ({
          id: r.id,
          studentId: r.student_id,
          rewardId: r.reward_id,
          rewardName: r.reward_name,
          rewardIcon: r.reward_icon,
          cost: r.cost,
          status: r.status,
          requestDate: r.request_date,
          actionDate: r.action_date
        })));
      }

      if (transactionsRes.status === 'fulfilled' && transactionsRes.value.data) {
        setPointTransactions(transactionsRes.value.data.map((t: any) => ({
          ...t,
          studentId: t.student_id,
          timestamp: new Date(t.date).getTime()
        })));
      }

    } catch (e: any) {
      console.error("Data refresh failed:", e.message);
    }
  };

  const login = async (email: string, pass: string): Promise<string | null> => {
    try {
      const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password: pass });
      if (error) return error.message;
      if (data.user) { 
        const profileError = await fetchProfile(data.user.id, data.user); 
        return profileError; 
      }
      return "Login failed: User credentials verified but profile could not be loaded.";
    } catch (e: any) { 
      return e.message || "An unexpected error occurred during login."; 
    }
  };

  const signup = async (email: string, pass: string, name: string, role: UserRole, gender?: Gender): Promise<string | null> => {
    try {
      const { error } = await (supabase.auth as any).signUp({ 
        email, 
        password: pass, 
        options: { data: { name, role, gender: gender || null } } 
      });
      if (error) return error.message;
      return null;
    } catch(e: any) {
      return e.message;
    }
  };

  const logout = async () => { 
    try {
      setCurrentUser(null); 
      setViewRoleState(null); 
      setUsers([]); 
      setTests([]); 
      setPlans([]); 
      setQuestionBank([]); 
      userIdRef.current = null;
      await (supabase.auth as any).signOut(); 
    } catch (e) {
      console.warn("Logout error:", e);
    }
  };
  
  const setViewRole = (role: UserRole) => {
    if (currentUser?.role === UserRole.ADMIN || role === currentUser?.role) {
      setViewRoleState(role);
    }
  };

  const switchUser = (role: UserRole) => { setViewRole(role); };

  const addUser = async (user: Partial<User> & { password?: string }): Promise<AddUserResponse> => {
    if (!user.email || !user.password) return { success: false, message: "Missing email or password." };
    try {
      const { data: authData, error: authError } = await (supabase.auth as any).signUp({
        email: user.email,
        password: user.password,
        options: { data: { name: user.name, role: user.role, gender: user.gender || null } }
      });
      if (authError) return { success: false, message: authError.message };
      refreshData();
      return { success: true, message: "User account created in authentication system." };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const seedDatabase = async () => {
    if (subjects.length > 0) return; 
    try {
      for (const sub of INITIAL_SUBJECTS) await supabase.from('subjects').insert(sub);
      for (const r of INITIAL_REWARDS) await supabase.from('rewards').insert({ ...r, parent_id: r.parentId });
      await refreshData();
    } catch(e: any) {
      alert("Seeding failed: " + e.message);
    }
  };

  const calculatePoints = (category: PointCategory, scorePercentage: number = 0): { points: number, breakdown: string[] } => {
    const rule = pointRules.find(r => r.category === category);
    if (!rule || !rule.enabled) return { points: 0, breakdown: [] };
    let total = rule.basePoints;
    const breakdown = [`Base completion: +${rule.basePoints}`];
    if (rule.scoreRanges) {
      const range = rule.scoreRanges.find(r => scorePercentage >= r.min && scorePercentage <= r.max);
      if (range) { total += range.points; breakdown.push(`Performance bonus: +${range.points}`); }
    }
    if (scorePercentage === 100 && rule.bonusPerfect) { total += rule.bonusPerfect; breakdown.push(`Perfect score bonus: +${rule.bonusPerfect}`); }
    return { points: total, breakdown };
  };

  const addSubject = async (s: Subject) => { await supabase.from('subjects').insert(s); refreshData(); };
  const updateSubject = async (s: Subject) => { await supabase.from('subjects').update(s).eq('id', s.id); refreshData(); };
  const deleteSubject = async (id: string) => { await supabase.from('subjects').delete().eq('id', id); refreshData(); };
  const addTopic = async (t: Topic, refresh = true) => { const { error } = await supabase.from('topics').insert({ ...t, subject_id: t.subjectId }); if (!error && refresh) refreshData(); return { error }; };
  const updateTopic = async (t: Topic) => { await supabase.from('topics').update({ name: t.name, description: t.description }).eq('id', t.id); refreshData(); };
  const deleteTopic = async (id: string) => { await supabase.from('topics').delete().eq('id', id); refreshData(); };
  const addSubTopic = async (st: SubTopic, topicId: string) => { await supabase.from('sub_topics').insert({ ...st, topic_id: topicId }); refreshData(); };
  const updateSubTopic = async (st: SubTopic) => { await supabase.from('sub_topics').update(st).eq('id', st.id); refreshData(); };
  const deleteSubTopic = async (id: string) => { await supabase.from('sub_topics').delete().eq('id', id); refreshData(); };
  const updateUser = async (user: User) => { await supabase.from('profiles').update({ name: user.name, coins: user.coins, role: user.role, linked_user_ids: user.linkedUserIds }).eq('id', user.id); refreshData(); };
  const deleteUser = async (id: string) => { await supabase.from('profiles').delete().eq('id', id); refreshData(); };
  const getUser = (id: string) => users.find(u => u.id === id);
  const addPlan = async (p: StudyPlan) => { await supabase.from('study_plans').insert({ ...p, student_id: p.studentId, parent_id: p.parentId, subject_id: p.subjectId, topic_id: p.topicId }); refreshData(); };
  const updatePlan = async (p: StudyPlan) => { await supabase.from('study_plans').update(p).eq('id', p.id); refreshData(); };
  const deletePlan = async (id: string) => { await supabase.from('study_plans').delete().eq('id', id); refreshData(); };
  const markPlanComplete = async (id: string) => { await supabase.from('study_plans').update({ completed: true }).eq('id', id); refreshData(); };
  const addTest = async (t: Test) => { await supabase.from('tests').insert({ ...t, subject_id: t.subjectId, assigned_to: t.assignedTo, created_by: t.createdBy, assigned_date: t.assignedDate }); refreshData(); };
  const updateTest = async (t: Test) => { await supabase.from('tests').update(t).eq('id', t.id); refreshData(); };
  const deleteTest = async (id: string) => { await supabase.from('tests').delete().eq('id', id); refreshData(); };
  const completeTest = async (id: string, score: number, answers: number[], time?: number) => { await supabase.from('tests').update({ score, student_answers: answers, completed: true, time_taken: time }).eq('id', id); refreshData(); };
  const redeemReward = (rid: string, cost: number) => true;
  const addReward = async (r: Reward) => { await supabase.from('rewards').insert({ ...r, parent_id: r.parentId }); refreshData(); };
  const updateReward = async (r: Reward) => { await supabase.from('rewards').update(r).eq('id', r.id); refreshData(); };
  const deleteReward = async (id: string) => { await supabase.from('rewards').delete().eq('id', id); refreshData(); };
  const updatePointRule = (rule: PointRule) => {};
  const requestReward = (reward: Reward, sid: string) => {};
  const approveRewardRequest = (rid: string) => {};
  const rejectRewardRequest = (rid: string) => {};
  const fulfillRewardRequest = (rid: string) => {};
  const addManualPoints = (sid: string, amt: number, desc: string) => {};
  const addQuestionToBank = async (q: any) => {};
  const deleteQuestionFromBank = async (id: string) => {};
  const uploadQuestionsBulk = async (csv: string) => ({ success: 0, failed: 0, errors: [] });
  const updateAiGlobalBehavior = (b: string) => setAiGlobalBehavior(b);

  return (
    <AppContext.Provider value={{
      currentUser, viewRole, setViewRole, isLoading, dbError, login, signup, logout, users, subjects, topics, tests, plans, rewards,
      pointRules, rewardRequests, pointTransactions, questionBank,
      addSubject, updateSubject, deleteSubject, addTopic, updateTopic, deleteTopic, 
      addSubTopic, updateSubTopic, deleteSubTopic,
      addUser, updateUser, deleteUser, getUser,
      addPlan, updatePlan, deletePlan, markPlanComplete, addTest, updateTest, deleteTest, completeTest, 
      redeemReward, addReward, updateReward, deleteReward, 
      updatePointRule, requestReward, approveRewardRequest, rejectRewardRequest, fulfillRewardRequest, addManualPoints,
      seedDatabase, switchUser, refreshData, calculatePoints,
      aiGlobalBehavior, updateAiGlobalBehavior,
      addQuestionToBank, deleteQuestionFromBank, uploadQuestionsBulk
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
