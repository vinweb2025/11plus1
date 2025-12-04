
import { Subject, Topic, User, UserRole, DifficultyLevel, TestType, TaskStatus } from './types';
import { Calculator, BookOpen, Brain, Shapes, Star, GraduationCap, Puzzle } from 'lucide-react';
import React from 'react';

export const INITIAL_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Admin User', 
    email: 'admin@11plus.com',
    password: 'password',
    role: UserRole.ADMIN, 
    avatar: 'https://picsum.photos/200/200?random=1',
    active: true,
    createdAt: '2023-01-01',
    linkedUserIds: []
  },
  { 
    id: 'u2', 
    name: 'Sarah Parent', 
    email: 'sarah@example.com',
    password: 'password',
    role: UserRole.PARENT, 
    avatar: 'https://picsum.photos/200/200?random=2',
    active: true,
    phone: '07700 900000',
    createdAt: '2023-05-15',
    linkedUserIds: ['u3'] // Linked to Leo
  },
  { 
    id: 'u3', 
    name: 'Leo Student', 
    email: 'leo@example.com',
    password: 'password',
    role: UserRole.STUDENT, 
    avatar: 'https://picsum.photos/200/200?random=3',
    active: true,
    grade: 'Year 5',
    school: 'Primary School A',
    createdAt: '2023-05-15',
    linkedUserIds: ['u2'] // Linked to Sarah
  },
];

export const INITIAL_SUBJECTS: Subject[] = [
  { 
    id: 's1', 
    name: 'Maths', 
    description: 'Numbers, shapes, data and solving problems.',
    active: true,
    color: 'bg-blue-500', 
    icon: 'Calculator',
    order: 0
  },
  { 
    id: 's2', 
    name: 'English', 
    description: 'Reading comprehension, writing and grammar skills.',
    active: true,
    color: 'bg-green-500', 
    icon: 'BookOpen',
    order: 1
  },
  { 
    id: 's3', 
    name: 'Verbal Reasoning', 
    description: 'Solving problems using words and letters.',
    active: true,
    color: 'bg-purple-500', 
    icon: 'Brain',
    order: 2
  },
  { 
    id: 's4', 
    name: 'Non-Verbal Reasoning', 
    description: 'Solving problems using pictures and patterns.',
    active: true,
    color: 'bg-orange-500', 
    icon: 'Shapes',
    order: 3
  },
];

export const INITIAL_TOPICS: Topic[] = [
  { 
    id: 't1', 
    subjectId: 's1', 
    name: 'Number & Place Value', 
    description: 'Understanding the value of digits in a number.',
    difficulty: DifficultyLevel.EASY,
    recommendedYear: 'Year 4',
    tags: ['Core'],
    order: 0,
    subTopics: [
      { 
        id: 'st1', 
        name: 'Rounding',
        explanation: 'Rounding means changing a number to a simpler one that is close to the original value.',
        learningObjective: 'Round any number to the nearest 10, 100 or 1000.',
        exampleQuestions: ['Round 145 to the nearest 10.'],
        difficulty: DifficultyLevel.EASY,
        order: 0
      }, 
      { 
        id: 'st2', 
        name: 'Negative Numbers',
        explanation: 'Negative numbers are numbers less than zero, like -5.',
        learningObjective: 'Count backwards through zero.',
        exampleQuestions: ['What is 3 minus 5?'],
        difficulty: DifficultyLevel.MEDIUM,
        order: 1
      }
    ] 
  },
  { 
    id: 't2', 
    subjectId: 's1', 
    name: 'Fractions', 
    description: 'Parts of a whole number.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 5',
    tags: ['Grammar School'],
    order: 1,
    subTopics: [
      { 
        id: 'st3', 
        name: 'Simplifying Fractions',
        explanation: 'Making fractions as simple as possible by dividing top and bottom by the same number.',
        learningObjective: 'Write fractions in their simplest form.',
        exampleQuestions: ['Simplify 4/8.'],
        difficulty: DifficultyLevel.MEDIUM,
        order: 0
      }
    ] 
  },
];

export const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Calculator': return <Calculator className="w-5 h-5" />;
    case 'BookOpen': return <BookOpen className="w-5 h-5" />;
    case 'Brain': return <Brain className="w-5 h-5" />;
    case 'Shapes': return <Shapes className="w-5 h-5" />;
    case 'Star': return <Star className="w-5 h-5" />;
    case 'Puzzle': return <Puzzle className="w-5 h-5" />;
    default: return <GraduationCap className="w-5 h-5" />;
  }
};
