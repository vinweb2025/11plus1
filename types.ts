
export enum UserRole {
  ADMIN = 'ADMIN',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT'
}

export enum SubjectType {
  MATHS = 'Maths',
  ENGLISH = 'English',
  VERBAL_REASONING = 'Verbal Reasoning',
  NON_VERBAL_REASONING = 'Non-Verbal Reasoning'
}

export enum DifficultyLevel {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
  MIXED = 'Mixed'
}

export enum TaskStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  MISSED = 'Missed'
}

export enum TestType {
  NORMAL = 'NORMAL',
  BASELINE = 'BASELINE'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  
  // Auth & Security
  email?: string; // Used as username
  password?: string; // Mock password storage
  active?: boolean;
  createdAt?: string;

  // Profile Details
  phone?: string;
  grade?: string; // For students (Year 4, 5, 6)
  school?: string;
  examDate?: string;

  // Relationships
  linkedUserIds?: string[]; // IDs of parents (if student) or children (if parent)
}

export interface SubTopic {
  id: string;
  name: string;
  explanation: string;
  learningObjective: string;
  exampleQuestions: string[];
  difficulty: DifficultyLevel;
  teacherNotes?: string;
  order: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  recommendedYear: string;
  tags: string[];
  subTopics: SubTopic[];
  order: number;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  active: boolean;
  color: string;
  icon: string;
  order: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface Test {
  id: string;
  type: TestType;
  title: string;
  subjectId: string;
  topicId?: string; // Optional for Baseline
  subTopicIds?: string[];
  questions: Question[];
  createdBy: string;
  assignedTo: string;
  assignedDate: string; // YYYY-MM-DD
  duration: number; // minutes
  status: TaskStatus;
  score?: number;
  studentAnswers?: number[]; // Array of selected option indices. -1 if skipped.
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  parentId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  topicId: string;
  subTopicIds: string[];
  duration: number; // minutes
  startTime?: string; // e.g., "17:00"
  notes: string;
  status: TaskStatus;
  completed: boolean;
}

// --- AI GENERATION TYPES ---
export interface AIGeneratedSubTopic {
  name: string;
  explanation: string;
  learningObjective: string;
  exampleQuestions: string[];
  difficulty: string;
}

export interface AIGeneratedTopic {
  name: string;
  description: string;
  difficulty: string;
  recommendedYear: string;
  subTopics: AIGeneratedSubTopic[];
  isSelected?: boolean; 
}
