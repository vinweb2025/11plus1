
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, Subject, Topic, Test, StudyPlan, UserRole, TaskStatus, Reward, DifficultyLevel, SubTopic, Gender, PointRule, RewardRequest, PointTransaction, PointCategory, TestType, QuestionBankItem } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TOPICS, INITIAL_REWARDS, INITIAL_POINT_RULES } from '../constants';
import { supabase } from '../lib/supabase';

// Helper to create a temporary client for Admin actions (creating users without logout)
// Uses in-memory storage to avoid conflicts with the main session in localStorage
const createEphemeralClient = () => {
  const supabaseUrl = 'https://zdeeictdsetconpixixp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWVpY3Rkc2V0Y29ucGl4aXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjYzOTUsImV4cCI6MjA4MDk0MjM5NX0.3sjkYDAKhH_Q4fk3dTQGusT2dr9dHaiv8kr0xv5P9I8';
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false, // Keeps session in memory only, not localStorage
      detectSessionInUrl: false
    }
  });
};

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
  // Question Bank
  addQuestionToBank: (q: Partial<QuestionBankItem>) => Promise<void>;
  deleteQuestionFromBank: (id: string) => Promise<void>;
  uploadQuestionsBulk: (csvText: string) => Promise<{success: number, failed: number, errors: string[]}>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to normalize difficulty to ensure it matches DB Enum Constraints
const normalizeDifficulty = (diff: string | undefined): DifficultyLevel => {
  if (!diff) return DifficultyLevel.MEDIUM;
  const d = diff.toLowerCase();
  if (d.includes('easy')) return DifficultyLevel.EASY;
  if (d.includes('hard')) return DifficultyLevel.HARD;
  if (d.includes('mixed')) return DifficultyLevel.MIXED;
  return DifficultyLevel.MEDIUM;
};

// Helper to safe-cast role strings
const normalizeRole = (roleStr: string): UserRole => {
  if (!roleStr) return UserRole.STUDENT;
  const r = roleStr.toUpperCase();
  if (r === 'ADMIN') return UserRole.ADMIN;
  if (r === 'PARENT') return UserRole.PARENT;
  if (r === 'TEACHER') return UserRole.TEACHER;
  return UserRole.STUDENT;
};

// Helper to normalize gender
const normalizeGender = (genderStr: string): Gender | undefined => {
  if (!genderStr) return undefined;
  const g = genderStr.toLowerCase();
  if (g === 'boy') return Gender.BOY;
  if (g === 'girl') return Gender.GIRL;
  return undefined;
}

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
  
  // AI Settings
  const [aiGlobalBehavior, setAiGlobalBehavior] = useState<string>(() => {
    return localStorage.getItem('ai_behavior') || "You are a friendly, patient, and encouraging tutor for 11+ students (aged 9-11). Use simple language, be positive, and focus on helping them understand concepts clearly.";
  });

  // Rewards System State
  const [pointRules, setPointRules] = useState<PointRule[]>(INITIAL_POINT_RULES);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Use ref to track current user ID for useEffect listeners to avoid stale closures
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = currentUser?.id || null;
  }, [currentUser]);

  // --- AUTH & INITIALIZATION ---
  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          if (!currentUser) {
             const basicUser: User = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.name || 'User',
                role: normalizeRole(session.user.user_metadata.role),
                active: true
             };
             setCurrentUser(basicUser);
             userIdRef.current = basicUser.id;
          }
          await fetchProfile(session.user.id, session.user);
        }
      } catch (err) {
        console.warn("Session Init Error:", err);
      } finally {
        if (mounted) {
           setIsLoading(false);
           refreshData(); // Fetch public data regardless
        }
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
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

  const setViewRole = (role: UserRole) => {
    if (currentUser?.role === UserRole.ADMIN || role === currentUser?.role) {
      setViewRoleState(role);
    }
  };

  const updateAiGlobalBehavior = (behavior: string) => {
    setAiGlobalBehavior(behavior);
    localStorage.setItem('ai_behavior', behavior);
  };

  const fetchProfile = async (userId: string, userObject?: SupabaseUser): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (data && !error) {
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
        setDbError(null);
        return null;
      }

      let authUser = userObject;
      if (!authUser) {
          const { data: fetched } = await supabase.auth.getUser();
          authUser = fetched.user || undefined;
      }

      if (!authUser || authUser.id !== userId) return "Session mismatch or missing user data.";

      const baseData = {
        id: authUser.id,
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

      const { error: insertError } = await supabase.from('profiles').insert(baseData);
      
      if (insertError) {
         console.error("Profile Creation Failed:", insertError);
         setCurrentUser({ ...baseData, id: userId } as User);
         userIdRef.current = userId;
         setViewRoleState(baseData.role);
         return null;
      }

      const { data: retryData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (retryData) {
         const user: User = {
            id: retryData.id,
            name: retryData.name,
            role: normalizeRole(retryData.role),
            email: retryData.email,
            avatar: retryData.avatar,
            active: retryData.active,
            coins: retryData.coins,
            inventory: retryData.inventory || [],
            linkedUserIds: retryData.linked_user_ids || [],
            grade: retryData.grade,
            school: retryData.school,
            phone: retryData.phone,
            gender: normalizeGender(retryData.gender)
         };
         setCurrentUser(user);
         userIdRef.current = user.id;
         setViewRoleState(user.role);
         return null;
      }

      setCurrentUser({ ...baseData, id: userId } as User);
      userIdRef.current = userId;
      setViewRoleState(baseData.role);
      return null;

    } catch (e: any) {
      console.error("Fetch Profile Critical Exception:", e);
      if (userObject) {
         const fallbackUser: User = {
            id: userObject.id,
            name: userObject.user_metadata.name || 'User',
            email: userObject.email,
            role: normalizeRole(userObject.user_metadata.role),
            active: true
         };
         setCurrentUser(fallbackUser);
         userIdRef.current = userObject.id;
         setViewRoleState(fallbackUser.role);
         return null;
      }
      return "Login failed unexpectedly.";
    }
  };

  const refreshData = async () => {
    try {
      const subjectsRes = await supabase.from('subjects').select('*').order('order');
      if (subjectsRes.error) {
         if (subjectsRes.error.code === '42P01') setDbError("Missing Database Tables. Please run the SQL setup script.");
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

      const [profilesRes, testsRes, plansRes, rewardsRes, requestsRes, transactionsRes, questionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('tests').select('*'),
        supabase.from('study_plans').select('*'),
        supabase.from('rewards').select('*'),
        supabase.from('reward_requests').select('*').order('request_date', { ascending: false }),
        supabase.from('point_transactions').select('*').order('date', { ascending: false }),
        supabase.from('question_bank').select('*').limit(500) // Limit loading for performance, but upload uses full check
      ]);

      if (profilesRes.data) {
        setUsers(profilesRes.data.map((d:any) => ({
          ...d, 
          linkedUserIds: d.linked_user_ids || [], 
          role: normalizeRole(d.role),
          avatar: d.avatar || `https://ui-avatars.com/api/?name=${d.name}&background=random`,
          gender: normalizeGender(d.gender)
        })));
      }

      if (questionsRes.data) {
        const mappedQuestions: QuestionBankItem[] = questionsRes.data.map((q: any) => ({
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
        }));
        setQuestionBank(mappedQuestions);
      }

      if (testsRes.data) {
        setTests(testsRes.data.map((d: any) => ({
          ...d,
          subjectId: d.subject_id,
          topicId: d.topic_id || (d.topic_ids && d.topic_ids.length > 0 ? d.topic_ids[0] : undefined), // Compatibility
          topicIds: d.topic_ids || (d.topic_id ? [d.topic_id] : []), // Compatibility
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

      if (plansRes.data) {
        setPlans(plansRes.data.map((d: any) => ({
          ...d,
          parentId: d.parent_id,
          studentId: d.student_id,
          subjectId: d.subject_id,
          topicId: d.topic_id,
          subTopicIds: d.sub_topic_ids
        })));
      }

      if (rewardsRes.data) {
        setRewards(rewardsRes.data.map((d: any) => {
          let isApprovalRequired = false;
          let cleanDescription = d.description;
          if (d.description?.startsWith('::REQ::')) {
             isApprovalRequired = true;
             cleanDescription = d.description.substring(7);
          } else if (d.approval_required) {
             isApprovalRequired = true;
          }
          return {
            ...d,
            parentId: d.parent_id,
            description: cleanDescription,
            approvalRequired: isApprovalRequired,
            weeklyLimit: d.weekly_limit
          };
        }));
      }

      if (requestsRes.data) {
        setRewardRequests(requestsRes.data.map((r: any) => ({
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

      if (transactionsRes.data) {
        setPointTransactions(transactionsRes.data.map((t: any) => ({
          id: t.id,
          studentId: t.student_id,
          amount: t.amount,
          category: t.category,
          description: t.description,
          date: t.date,
          timestamp: new Date(t.date).getTime()
        })));
      }

    } catch (e) {
      console.error("Data refresh failed", e);
    }
  };

  // --- REWARDS SYSTEM LOGIC ---

  const getPointsToday = (studentId: string, category: PointCategory): number => {
    const today = new Date().toISOString().split('T')[0];
    return pointTransactions
      .filter(t => t.studentId === studentId && t.category === category && t.date === today && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const addTransaction = async (studentId: string, amount: number, category: string, description: string) => {
    const newTx: PointTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId,
      amount,
      category,
      description,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };
    setPointTransactions(prev => [newTx, ...prev]);
    const { error } = await supabase.from('point_transactions').insert({
        id: newTx.id,
        student_id: newTx.studentId,
        amount: newTx.amount,
        category: newTx.category,
        description: newTx.description,
        date: newTx.date
    });
    if (error) console.error("Failed to persist transaction:", error);
  };

  const calculatePoints = (category: PointCategory, scorePercentage: number = 0): { points: number, breakdown: string[] } => {
    const rule = pointRules.find(r => r.category === category);
    if (!rule || !rule.enabled) return { points: 0, breakdown: [] };

    let total = rule.basePoints;
    const breakdown = [];
    if (rule.basePoints > 0) breakdown.push(`Base Points: +${rule.basePoints}`);

    if (rule.scoreRanges && rule.scoreRanges.length > 0) {
      const range = rule.scoreRanges.find(r => scorePercentage >= r.min && scorePercentage <= r.max);
      if (range) {
        total += range.points;
        breakdown.push(`Score Bonus (${range.min}-${range.max}%): +${range.points}`);
      }
    }

    if (scorePercentage === 100 && rule.bonusPerfect) {
      total += rule.bonusPerfect;
      breakdown.push(`Perfect Score Bonus: +${rule.bonusPerfect}`);
    }

    return { points: total, breakdown };
  };

  const awardPoints = async (studentId: string, points: number, category: PointCategory, breakdown: string[]) => {
    const rule = pointRules.find(r => r.category === category);
    let finalPoints = points;
    if (rule?.dailyCap) {
      const currentToday = getPointsToday(studentId, category);
      if (currentToday >= rule.dailyCap) {
        finalPoints = 0;
        breakdown.push(`Daily Cap Reached (Max ${rule.dailyCap})`);
      } else if (currentToday + finalPoints > rule.dailyCap) {
        finalPoints = rule.dailyCap - currentToday;
        breakdown.push(`Daily Cap Adjusted (Max ${rule.dailyCap})`);
      }
    }

    if (finalPoints > 0) {
      const student = users.find(u => u.id === studentId);
      if (student) {
        await updateUser({ ...student, coins: (student.coins || 0) + finalPoints });
        addTransaction(studentId, finalPoints, category, breakdown.join(', '));
      }
    }
  };

  const updatePointRule = (rule: PointRule) => {
    setPointRules(prev => prev.map(r => r.id === rule.id ? rule : r));
  };

  const addManualPoints = async (studentId: string, amount: number, description: string) => {
    const student = users.find(u => u.id === studentId);
    if (!student) return;
    const newCoins = Math.max(0, (student.coins || 0) + amount);
    await updateUser({ ...student, coins: newCoins });
    addTransaction(studentId, amount, PointCategory.MANUAL, description);
  };

  const requestReward = async (reward: Reward, studentId: string) => {
    if (reward.approvalRequired) {
      const newReq: RewardRequest = {
        id: `req-${Date.now()}`,
        studentId,
        rewardId: reward.id,
        rewardName: reward.name,
        rewardIcon: reward.icon,
        cost: reward.cost,
        status: 'PENDING',
        requestDate: new Date().toISOString()
      };
      setRewardRequests(prev => [newReq, ...prev]);
      const { error } = await supabase.from('reward_requests').insert({
          id: newReq.id,
          student_id: newReq.studentId,
          reward_id: newReq.rewardId,
          reward_name: newReq.rewardName,
          reward_icon: newReq.rewardIcon,
          cost: newReq.cost,
          status: 'PENDING',
          request_date: newReq.requestDate
      });
      if (error) console.error("Failed to save reward request:", error);
    } else {
      redeemReward(reward.id, reward.cost);
      addTransaction(studentId, -reward.cost, 'Redemption', `Redeemed ${reward.name}`);
    }
  };

  const approveRewardRequest = async (requestId: string) => {
    const request = rewardRequests.find(r => r.id === requestId);
    if (!request) return;
    const student = users.find(u => u.id === request.studentId);
    if (student && (student.coins || 0) >= request.cost) {
      await updateUser({ ...student, coins: (student.coins || 0) - request.cost });
      const updatedReq = { ...request, status: 'APPROVED' as const, actionDate: new Date().toISOString() };
      setRewardRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
      addTransaction(request.studentId, -request.cost, 'Redemption', `Approved: ${request.rewardName}`);
      await supabase.from('reward_requests').update({ status: 'APPROVED', action_date: new Date().toISOString() }).eq('id', requestId);
    } else {
      alert("Student does not have enough points anymore.");
    }
  };

  const rejectRewardRequest = async (requestId: string) => {
    setRewardRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REJECTED', actionDate: new Date().toISOString() } : r));
    await supabase.from('reward_requests').update({ status: 'REJECTED', action_date: new Date().toISOString() }).eq('id', requestId);
  };

  const fulfillRewardRequest = async (requestId: string) => {
    setRewardRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'FULFILLED', actionDate: new Date().toISOString() } : r));
    await supabase.from('reward_requests').update({ status: 'FULFILLED', action_date: new Date().toISOString() }).eq('id', requestId);
  };

  // --- QUESTION BANK LOGIC ---

  const addQuestionToBank = async (q: Partial<QuestionBankItem>) => {
    const payload = {
        topic_id: q.topicId,
        text: q.text,
        options: q.options,
        correct_answer_index: q.correctAnswerIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: q.tags || [],
        usage_count: 0
    };
    const { error } = await supabase.from('question_bank').insert(payload);
    if (error) {
       console.error("Add Question Error", error);
       alert("Failed to add question to bank.");
    } else {
       await refreshData();
    }
  };

  const deleteQuestionFromBank = async (id: string) => {
    const { error } = await supabase.from('question_bank').delete().eq('id', id);
    if (error) {
       console.error("Delete Question Error", error);
    } else {
       await refreshData();
    }
  };

  // --- CSV UPLOAD LOGIC ---
  const uploadQuestionsBulk = async (csvText: string): Promise<{success: number, failed: number, errors: string[]}> => {
    const rows = csvText.split('\n');
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    // Fetch current state from DB to compare against for duplicates (more accurate than local state limit)
    // Select just topic_id and text to check duplicates efficiently
    const { data: allQuestions } = await supabase.from('question_bank').select('topic_id, text');
    const processedQuestions = new Set<string>(); // Composite Key: topic_id + question_text (normalized)

    // Header check: Subject, Topic, Question, Option A, Option B, Option C, Option D, Correct (1-4), Difficulty, Explanation
    const startRow = 1; // Assuming header is row 0

    for (let i = startRow; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;
        
        // Simple CSV parse handling quotes
        const cols: string[] = [];
        let inQuote = false;
        let buffer = '';
        for (let c of row) {
            if (c === '"') { inQuote = !inQuote; }
            else if (c === ',' && !inQuote) { cols.push(buffer); buffer = ''; }
            else { buffer += c; }
        }
        cols.push(buffer); // Last col

        const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());
        
        if (cleanCols.length < 8) {
            failedCount++;
            errors.push(`Row ${i + 1}: Not enough columns`);
            continue;
        }

        const [subjName, topicName, qText, optA, optB, optC, optD, correctStr, diffStr, explainStr] = cleanCols;

        // 1. Resolve Subject & Topic
        const subject = subjects.find(s => s.name.toLowerCase() === subjName.toLowerCase());
        if (!subject) {
            failedCount++;
            errors.push(`Row ${i + 1}: Subject '${subjName}' not found`);
            continue;
        }

        const topic = topics.find(t => t.subjectId === subject.id && t.name.toLowerCase() === topicName.toLowerCase());
        if (!topic) {
            failedCount++;
            errors.push(`Row ${i + 1}: Topic '${topicName}' not found in ${subjName}`);
            continue;
        }

        // 2. Validate Data
        if (!qText || !optA || !optB || !optC || !optD) {
            failedCount++;
            errors.push(`Row ${i + 1}: Missing question or options`);
            continue;
        }

        // --- DUPLICATE CHECK LOGIC ---
        // Check duplicates within the current upload batch
        const uniqueKey = `${topic.id}-${qText.toLowerCase().trim()}`;
        if (processedQuestions.has(uniqueKey)) {
            failedCount++;
            errors.push(`Row ${i + 1}: Duplicate question detected (in this batch).`);
            continue;
        }

        // Check existing in DB
        const duplicateInDb = allQuestions?.some(q => 
            q.topic_id === topic.id && 
            (q.text || '').toLowerCase().trim() === qText.toLowerCase().trim()
        );

        if (duplicateInDb) {
            failedCount++;
            errors.push(`Row ${i + 1}: Question already exists in database.`);
            continue;
        }

        let correctIdx = parseInt(correctStr) - 1; // Expecting 1-4 input
        if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
             // Try parsing letters A,B,C,D
             const map: Record<string, number> = {'a':0, 'b':1, 'c':2, 'd':3};
             correctIdx = map[correctStr.toLowerCase()] ?? -1;
        }

        if (correctIdx < 0 || correctIdx > 3) {
            failedCount++;
            errors.push(`Row ${i + 1}: Invalid correct answer '${correctStr}' (Use 1-4 or A-D)`);
            continue;
        }

        // 3. Insert
        const payload = {
            topic_id: topic.id,
            text: qText,
            options: [optA, optB, optC, optD],
            correct_answer_index: correctIdx,
            explanation: explainStr || '',
            difficulty: normalizeDifficulty(diffStr),
            tags: ['Bulk Upload'],
            usage_count: 0
        };

        const { error } = await supabase.from('question_bank').insert(payload);
        if (error) {
            failedCount++;
            errors.push(`Row ${i + 1}: DB Error - ${error.message}`);
        } else {
            successCount++;
            processedQuestions.add(uniqueKey);
        }
    }

    await refreshData();
    return { success: successCount, failed: failedCount, errors };
  };

  // --- DATA METHODS ---

  const addUser = async (user: Partial<User> & { password?: string }): Promise<AddUserResponse> => {
    // ... (Existing addUser logic unchanged)
    if (!user.email || !user.password) return { success: false, message: "Email and password are required." };
    try {
      const tempClient = createEphemeralClient();
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: { name: user.name, role: user.role, grade: user.grade || null, school: user.school || null, phone: user.phone || null, linked_user_ids: user.linkedUserIds || [], avatar: user.avatar, active: user.active !== undefined ? user.active : true, coins: user.coins || 0, inventory: user.inventory || [], gender: user.gender || null }
        }
      });
      if (authError) return { success: false, message: `Auth Error: ${authError.message}` };
      if (authData.user) {
        const profileData = { id: authData.user.id, email: user.email, name: user.name, role: user.role, grade: user.grade || null, school: user.school || null, phone: user.phone || null, linked_user_ids: user.linkedUserIds || [], avatar: user.avatar, active: user.active !== undefined ? user.active : true, coins: user.coins || 0, inventory: user.inventory || [], gender: user.gender || null };
        supabase.from('profiles').upsert(profileData, { onConflict: 'id' }).then(({ error }) => { if (error) console.warn("Admin could not insert profile row (likely RLS).", error.message); });
        refreshData();
        if (!authData.session) return { success: true, message: "User created! Confirmation email sent.", requiresConfirmation: true };
        return { success: true, message: "User created successfully." };
      }
      return { success: false, message: "Unknown error: User object missing after signup." };
    } catch (err: any) {
      console.error("Add User Exception:", err);
      return { success: false, message: `Exception: ${err.message || 'Unknown error'}` };
    }
  };

  const seedDatabase = async () => {
    if (subjects.length > 0) return; 
    for (const sub of INITIAL_SUBJECTS) await supabase.from('subjects').insert(sub);
    for (const top of INITIAL_TOPICS) {
      const { subTopics, ...topicData } = top;
      await supabase.from('topics').insert({ ...topicData, subject_id: topicData.subjectId, recommended_year: topicData.recommendedYear });
      if (subTopics) {
        const safeSubTopics = subTopics.map(st => ({
            id: st.id,
            topic_id: top.id, 
            name: st.name,
            explanation: st.explanation,
            learning_objective: st.learningObjective, 
            example_questions: st.exampleQuestions,
            difficulty: normalizeDifficulty(st.difficulty),
            order: st.order
        }));
        await supabase.from('sub_topics').insert(safeSubTopics);
      }
    }
    for (const r of INITIAL_REWARDS) await supabase.from('rewards').insert({ ...r, parent_id: r.parentId });
    await refreshData();
  };

  const login = async (email: string, pass: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) return error.message;
      if (data.user) { await fetchProfile(data.user.id, data.user); return null; }
      return "Login successful but user data is missing.";
    } catch (e: any) { return e.message || "An unexpected error occurred during login."; }
  };

  const signup = async (email: string, pass: string, name: string, role: UserRole, gender?: Gender): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name, role, gender: gender || null } } });
    if (error) return error.message;
    return null;
  };

  const logout = async () => { 
    setCurrentUser(null); setViewRoleState(null); setUsers([]); setTests([]); setPlans([]); setQuestionBank([]); userIdRef.current = null;
    try { Object.keys(localStorage).forEach(key => { if (key.startsWith('sb-')) localStorage.removeItem(key); }); } catch (err) {}
    try { await supabase.auth.signOut(); } catch (e) {}
  };
  
  const switchUser = (role: UserRole) => { setViewRole(role); };

  const addSubject = async (s: Subject) => { await supabase.from('subjects').insert(s); refreshData(); };
  const updateSubject = async (s: Subject) => { await supabase.from('subjects').update(s).eq('id', s.id); refreshData(); };
  
  const deleteSubject = async (id: string) => { 
    try {
        const { data: topics } = await supabase.from('topics').select('id').eq('subject_id', id);
        if (topics && topics.length > 0) {
            const topicIds = topics.map(t => t.id);
            await supabase.from('sub_topics').delete().in('topic_id', topicIds);
        }
        await supabase.from('topics').delete().eq('subject_id', id);
        await supabase.from('tests').delete().eq('subject_id', id);
        await supabase.from('study_plans').delete().eq('subject_id', id);
        const { error } = await supabase.from('subjects').delete().eq('id', id); 
        if (error) throw error;
        await refreshData(); 
    } catch(e:any) { console.error("Delete Subject Error:", e); alert(`Failed to delete subject: ${e.message}`); }
  };
  
  const addTopic = async (t: Topic, shouldRefresh = true): Promise<{ error: any }> => {
    try {
        if (!t.subjectId) throw new Error("Topic must have a subjectId");
        const topicPayload = { id: t.id, subject_id: t.subjectId, name: t.name || 'Untitled Topic', description: t.description || '', difficulty: normalizeDifficulty(t.difficulty), recommended_year: t.recommendedYear || 'Year 5', tags: t.tags || [], order: t.order || 0 };
        const { error } = await supabase.from('topics').insert(topicPayload);
        if(error) return { error };
        if (t.subTopics && t.subTopics.length > 0) {
           const subPayloads = t.subTopics.map(st => ({ id: st.id, topic_id: t.id, name: st.name || 'Untitled Lesson', explanation: st.explanation || '', learning_objective: st.learningObjective || '', example_questions: st.exampleQuestions || [], difficulty: normalizeDifficulty(st.difficulty), order: st.order || 0 }));
           const { error: subError } = await supabase.from('sub_topics').insert(subPayloads);
           if (subError) return { error: subError };
        }
        if (shouldRefresh) await refreshData();
        return { error: null };
    } catch (err) { return { error: err }; }
  };

  const updateTopic = async (t: Topic) => { await supabase.from('topics').update({ name: t.name, description: t.description, difficulty: t.difficulty, recommended_year: t.recommendedYear }).eq('id', t.id); refreshData(); };
  const deleteTopic = async (id: string) => { await supabase.from('sub_topics').delete().eq('topic_id', id); await supabase.from('topics').delete().eq('id', id); refreshData(); };
  const addSubTopic = async (st: SubTopic, topicId: string) => { try { const payload = { id: st.id, topic_id: topicId, name: st.name, explanation: st.explanation, learning_objective: st.learningObjective, example_questions: st.exampleQuestions, difficulty: normalizeDifficulty(st.difficulty), order: st.order }; await supabase.from('sub_topics').insert(payload); await refreshData(); } catch (e) { console.error("Add SubTopic Error:", e); } };
  const updateSubTopic = async (st: SubTopic) => { try { const payload = { name: st.name, explanation: st.explanation, learning_objective: st.learningObjective, example_questions: st.exampleQuestions, difficulty: normalizeDifficulty(st.difficulty) }; await supabase.from('sub_topics').update(payload).eq('id', st.id); await refreshData(); } catch (e) { console.error("Update SubTopic Error:", e); } };
  const deleteSubTopic = async (id: string) => { try { await supabase.from('sub_topics').delete().eq('id', id); await refreshData(); } catch (e) { console.error("Delete SubTopic Error:", e); } };
  const updateUser = async (user: User) => { await supabase.from('profiles').update({ name: user.name, role: user.role, avatar: user.avatar, active: user.active, grade: user.grade, school: user.school, phone: user.phone, coins: user.coins, inventory: user.inventory, linked_user_ids: user.linkedUserIds, gender: user.gender }).eq('id', user.id); refreshData(); if (currentUser?.id === user.id) fetchProfile(user.id); };
  const deleteUser = async (id: string) => { await supabase.from('profiles').delete().eq('id', id); refreshData(); };
  const getUser = (id: string) => users.find(u => u.id === id);
  const addPlan = async (p: StudyPlan) => { const { error } = await supabase.from('study_plans').insert({ id: p.id, parent_id: p.parentId, student_id: p.studentId, subject_id: p.subjectId, topic_id: p.topicId, sub_topic_ids: p.subTopicIds && p.subTopicIds.length > 0 ? p.subTopicIds : null, date: p.date, duration: p.duration, notes: p.notes, status: p.status, completed: p.completed }); if(error) { console.error("Add Plan Error:", JSON.stringify(error, null, 2)); alert(`Failed to add study plan: ${error.message}`); } await refreshData(); };
  const updatePlan = async (p: StudyPlan) => { await supabase.from('study_plans').update({ notes: p.notes, status: p.status, completed: p.completed }).eq('id', p.id); refreshData(); };
  const deletePlan = async (id: string) => { setPlans(prev => prev.filter(p => p.id !== id)); try { await supabase.from('study_plans').delete().eq('id', id); } catch (error: any) { console.error("Delete Plan Error:", error); alert("Failed to delete plan: " + error.message); await refreshData(); } };
  const markPlanComplete = async (planId: string) => { const plan = plans.find(p => p.id === planId); if (!plan) return; await supabase.from('study_plans').update({ completed: true, status: TaskStatus.COMPLETED }).eq('id', planId); const { points, breakdown } = calculatePoints(PointCategory.ASSIGNMENT); await awardPoints(plan.studentId, points, PointCategory.ASSIGNMENT, breakdown); refreshData(); };
  const addTest = async (t: Test) => { 
    const modernPayload = { id: t.id, type: t.type, title: t.title, subject_id: t.subjectId, topic_ids: t.topicIds || (t.topicId ? [t.topicId] : []), sub_topic_ids: t.subTopicIds || null, subject_ids: t.subjectIds || null, assigned_to: t.assignedTo, created_by: t.createdBy, assigned_date: t.assignedDate, duration: t.duration, questions: t.questions, status: t.status, completed: t.completed, score: t.score ?? null, student_answers: t.studentAnswers ?? null };
    const { error: modernError } = await supabase.from('tests').insert(modernPayload); 
    if(modernError) { console.warn("Modern Insert Failed:", modernError); const legacyPayload = { id: t.id, type: t.type, title: t.title, subject_id: t.subjectId, topic_id: t.topicId || (t.topicIds && t.topicIds.length > 0 ? t.topicIds[0] : null), assigned_to: t.assignedTo, created_by: t.createdBy, assigned_date: t.assignedDate, duration: t.duration, questions: t.questions, status: t.status, completed: t.completed, score: t.score ?? null, student_answers: t.studentAnswers ?? null }; const { error: legacyError } = await supabase.from('tests').insert(legacyPayload); if (legacyError) { console.error("Legacy Insert Failed:", legacyError); alert(`Failed to create test. DB Error: ${modernError.message} | Legacy Error: ${legacyError.message}`); throw legacyError; } }
    await refreshData(); 
  };
  const updateTest = async (t: Test) => { await supabase.from('tests').update({ analysis: t.analysis }).eq('id', t.id); refreshData(); };
  const deleteTest = async (id: string) => { setTests(prev => prev.filter(t => t.id !== id)); try { await supabase.from('tests').delete().eq('id', id); } catch (error: any) { console.error("Delete Test Error:", error); alert("Failed to delete test: " + error.message); await refreshData(); } };
  const completeTest = async (testId: string, score: number, answers: number[], timeTaken?: number) => { const test = tests.find(t => t.id === testId); if (!test) return; const { error } = await supabase.from('tests').update({ score, student_answers: answers, completed: true, status: TaskStatus.COMPLETED, time_taken: timeTaken }).eq('id', testId); if (error) { console.error("Complete Test Error:", error); alert("Failed to submit test results. Please check database schema."); return; } const percentage = Math.round((score / test.questions.length) * 100); const category = test.type === TestType.MOCK ? PointCategory.MOCK_TEST : PointCategory.PRACTICE_TEST; const { points, breakdown } = calculatePoints(category, percentage); await awardPoints(test.assignedTo, points, category, breakdown); refreshData(); };
  const redeemReward = (rewardId: string, cost: number): boolean => { if (!currentUser || (currentUser.coins || 0) < cost) return false; const newInventory = [...(currentUser.inventory || []), rewardId]; const newCoins = (currentUser.coins || 0) - cost; updateUser({ ...currentUser, coins: newCoins, inventory: newInventory }); return true; };
  const addReward = async (r: Reward) => { const descPrefix = r.approvalRequired ? '::REQ::' : ''; const newDescription = r.description.startsWith('::REQ::') ? r.description : descPrefix + r.description; const payload = { id: r.id, name: r.name, description: newDescription, cost: r.cost, icon: r.icon, type: r.type, color: r.color, parent_id: r.parentId }; const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)); const { error } = await supabase.from('rewards').insert(cleanPayload); if(error) { console.error("Add Reward Error:", error.message); alert(`Error saving reward: ${error.message}`); } await refreshData(); };
  const updateReward = async (r: Reward) => { const descPrefix = r.approvalRequired ? '::REQ::' : ''; const newDescription = r.description.startsWith('::REQ::') ? r.description : descPrefix + r.description; const payload = { name: r.name, description: newDescription, cost: r.cost, icon: r.icon, color: r.color }; await supabase.from('rewards').update(payload).eq('id', r.id); refreshData(); };
  const deleteReward = async (id: string) => { await supabase.from('rewards').delete().eq('id', id); refreshData(); };

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
