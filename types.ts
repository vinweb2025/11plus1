
export enum UserRole {
  ADMIN = 'ADMIN',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER'
}

export enum Gender {
  BOY = 'Boy',
  GIRL = 'Girl'
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
  BASELINE = 'BASELINE',
  MOCK = 'MOCK'
}

export enum TopicStatus {
  LOCKED = 'LOCKED',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  MASTERED = 'MASTERED'
}

export enum PointCategory {
  ASSIGNMENT = 'Assignment',
  PRACTICE_TEST = 'Practice Test',
  MOCK_TEST = 'Mock Test',
  READING = 'Reading',
  BONUS = 'Bonus',
  MANUAL = 'Manual Adjustment'
}

export interface ScoreRange {
  min: number;
  max: number;
  points: number;
}

export interface PointRule {
  id: string;
  category: PointCategory;
  basePoints: number; // Points just for finishing
  scoreRanges?: ScoreRange[]; // For tests: percentage based
  bonusPerfect?: number; // Bonus for 100%
  bonusFirstAttempt?: number; // Bonus if first try
  dailyCap?: number; // Max points per day for this category
  enabled: boolean;
}

export interface PointTransaction {
  id: string;
  studentId: string;
  amount: number; // Positive for earn, negative for spend
  category: string; // PointCategory or 'Redemption'
  description: string;
  date: string; // ISO Date
  timestamp: number;
}

export interface RewardRequest {
  id: string;
  studentId: string;
  rewardId: string;
  rewardName: string;
  rewardIcon: string;
  cost: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  requestDate: string;
  actionDate?: string;
}

export interface RoadmapAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: { topic: string; duration: string }[];
  summary: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  
  // Auth & Security
  email?: string;
  password?: string;
  active?: boolean;
  createdAt?: string;

  // Profile Details
  gender?: Gender; // Added for 11+ Criteria
  phone?: string;
  grade?: string;
  school?: string;
  examDate?: string;

  // Relationships
  linkedUserIds?: string[];

  // Gamification
  coins?: number;
  inventory?: string[]; // IDs of rewards owned/fulfilled
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string; // Lucide icon name or emoji
  type: 'digital' | 'real';
  color: string;
  parentId?: string; // Optional: if null, it's a system reward
  approvalRequired?: boolean; // Default true
  weeklyLimit?: number; // Optional limit
  redemptionsCount?: number;
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
  topic?: string;
  // Metadata for Question Bank
  difficulty?: DifficultyLevel;
  usageCount?: number;
  tags?: string[];
  source?: 'AI' | 'BANK';
}

export interface QuestionBankItem extends Question {
  topicId: string; // Link to Topic Table
  subjectId?: string; // Helper for UI filtering
}

export interface Test {
  id: string;
  type: TestType;
  title: string;
  subjectId: string;
  subjectIds?: string[]; // For multi-subject mock exams
  topicId?: string; // Kept for backward compatibility or single topic reference
  topicIds?: string[]; // Added to support multiple topics
  subTopicIds?: string[];
  questions: Question[];
  createdBy: string;
  assignedTo: string;
  assignedDate: string;
  duration: number;
  status: TaskStatus;
  score?: number;
  studentAnswers?: number[];
  completed: boolean;
  analysis?: RoadmapAnalysis;
  timeTaken?: number;
}

export interface StudyPlan {
  id: string;
  parentId: string;
  studentId: string;
  date: string;
  subjectId: string;
  topicId: string;
  subTopicIds: string[];
  duration: number;
  startTime?: string;
  notes: string;
  status: TaskStatus;
  completed: boolean;
}

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
