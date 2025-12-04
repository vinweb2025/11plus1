
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Subject, Topic, Test, StudyPlan, UserRole, TaskStatus } from '../types';
import { INITIAL_USERS, INITIAL_SUBJECTS, INITIAL_TOPICS } from '../constants';

interface AppContextType {
  currentUser: User | null;
  switchUser: (role: UserRole) => void;
  login: (user: User) => void;
  logout: () => void;
  users: User[];
  subjects: Subject[];
  topics: Topic[];
  tests: Test[];
  plans: StudyPlan[];
  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  addTopic: (topic: Topic) => void;
  updateTopic: (topic: Topic) => void;
  deleteTopic: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  getUser: (id: string) => User | undefined;
  addPlan: (plan: StudyPlan) => void;
  updatePlan: (plan: StudyPlan) => void;
  addTest: (test: Test) => void;
  completeTest: (testId: string, score: number, answers: number[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  // START LOGGED OUT
  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
  const [tests, setTests] = useState<Test[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);

  const switchUser = (role: UserRole) => {
    const user = users.find(u => u.role === role);
    if (user) setCurrentUser(user);
  };

  const login = (user: User) => {
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  }

  // Use functional updates (prev => ...) to ensure we always work with the latest state
  const addSubject = (subject: Subject) => setSubjects(prev => [...prev, subject]);
  const updateSubject = (subject: Subject) => setSubjects(prev => prev.map(s => s.id === subject.id ? subject : s));
  const deleteSubject = (id: string) => setSubjects(prev => prev.filter(s => s.id !== id));

  const addTopic = (topic: Topic) => setTopics(prev => [...prev, topic]);
  const updateTopic = (topic: Topic) => setTopics(prev => prev.map(t => t.id === topic.id ? topic : t));
  const deleteTopic = (id: string) => setTopics(prev => prev.filter(t => t.id !== id));

  const addUser = (user: User) => setUsers(prev => [...prev, user]);
  const updateUser = (user: User) => setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));
  
  const getUser = (id: string) => users.find(u => u.id === id);
  
  const addPlan = (plan: StudyPlan) => setPlans(prev => [...prev, plan]);
  const updatePlan = (plan: StudyPlan) => setPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
  
  const addTest = (test: Test) => setTests(prev => [...prev, test]);
  
  const completeTest = (testId: string, score: number, answers: number[]) => {
    setTests(prev => prev.map(t => 
      t.id === testId ? { 
        ...t, 
        score, 
        studentAnswers: answers, 
        completed: true, 
        status: TaskStatus.COMPLETED 
      } : t
    ));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      switchUser,
      login,
      logout,
      users,
      subjects,
      topics,
      tests,
      plans,
      addSubject,
      updateSubject,
      deleteSubject,
      addTopic,
      updateTopic,
      deleteTopic,
      addUser,
      updateUser,
      deleteUser,
      getUser,
      addPlan,
      updatePlan,
      addTest,
      completeTest
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
