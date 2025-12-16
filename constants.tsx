
import { Subject, Topic, User, UserRole, DifficultyLevel, Reward, Gender, PointRule, PointCategory } from './types';
import { 
  Calculator, BookOpen, Brain, Shapes, Star, GraduationCap, Puzzle,
  Monitor, Pizza, Bot, Rocket, Ticket, IceCream, Heart, Gamepad2, Music, Camera, Bike, Gift,
  Trophy, Zap, Crown, Palette, Sun, Moon, Umbrella, Headphones
} from 'lucide-react';
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
    linkedUserIds: [],
    coins: 0,
    inventory: []
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
    linkedUserIds: ['u3'],
    coins: 0,
    inventory: []
  },
  { 
    id: 'u3', 
    name: 'Leo Student', 
    email: 'leo@example.com',
    password: 'password',
    role: UserRole.STUDENT,
    gender: Gender.BOY, 
    avatar: 'https://picsum.photos/200/200?random=3',
    active: true,
    grade: 'Year 5',
    school: 'Primary School A',
    createdAt: '2023-05-15',
    linkedUserIds: ['u2', 'u4'],
    coins: 150, // Starter coins
    inventory: []
  },
  { 
    id: 'u4', 
    name: 'Mr. Thompson', 
    email: 'teacher@example.com',
    password: 'password',
    role: UserRole.TEACHER, 
    avatar: 'https://picsum.photos/200/200?random=4',
    active: true,
    school: 'Excellence Tutors',
    createdAt: '2023-06-01',
    linkedUserIds: ['u3'],
    coins: 0,
    inventory: []
  },
];

export const INITIAL_POINT_RULES: PointRule[] = [
  {
    id: 'rule-assignment',
    category: PointCategory.ASSIGNMENT,
    basePoints: 10,
    enabled: true,
    dailyCap: 50
  },
  {
    id: 'rule-practice',
    category: PointCategory.PRACTICE_TEST,
    basePoints: 5,
    scoreRanges: [
      { min: 0, max: 49, points: 0 },
      { min: 50, max: 69, points: 5 },
      { min: 70, max: 84, points: 10 },
      { min: 85, max: 100, points: 20 }
    ],
    bonusPerfect: 10,
    enabled: true,
    dailyCap: 100
  },
  {
    id: 'rule-mock',
    category: PointCategory.MOCK_TEST,
    basePoints: 20,
    scoreRanges: [
      { min: 0, max: 49, points: 10 },
      { min: 50, max: 69, points: 20 },
      { min: 70, max: 84, points: 40 },
      { min: 85, max: 100, points: 60 }
    ],
    bonusPerfect: 20,
    enabled: true
  },
  {
    id: 'rule-reading',
    category: PointCategory.READING,
    basePoints: 10, // Per session/completion
    enabled: true,
    dailyCap: 30
  }
];

export const INITIAL_REWARDS: Reward[] = [
  { id: 'r1', name: '1 Hour Screen Time', description: 'Extra time for games or TV.', cost: 500, icon: 'Monitor', type: 'real', color: 'bg-blue-500', approvalRequired: true },
  { id: 'r2', name: 'Pizza Night', description: 'Pick the toppings for dinner!', cost: 1000, icon: 'Pizza', type: 'real', color: 'bg-orange-500', approvalRequired: true },
  { id: 'r3', name: 'Cool Robot Avatar', description: 'Unlock a new profile picture.', cost: 200, icon: 'Bot', type: 'digital', color: 'bg-gray-700', approvalRequired: false },
  { id: 'r4', name: 'Space Theme', description: 'Make your dashboard look cosmic.', cost: 300, icon: 'Rocket', type: 'digital', color: 'bg-blue-800', approvalRequired: false },
  { id: 'r5', name: 'No Chores Pass', description: 'Skip one household chore.', cost: 800, icon: 'Ticket', type: 'real', color: 'bg-cyan-500', approvalRequired: true },
  { id: 'r6', name: 'Ice Cream Treat', description: 'Get a delicious dessert.', cost: 400, icon: 'IceCream', type: 'real', color: 'bg-orange-400', approvalRequired: true },
];

export const REWARD_ICONS = [
  'Monitor', 'Pizza', 'Bot', 'Rocket', 'Ticket', 'IceCream', 'Star', 'Heart', 'Gamepad', 'Music', 'Camera', 'Bike', 'Gift',
  'Trophy', 'Zap', 'Crown', 'Palette', 'Sun', 'Moon', 'Umbrella', 'Headphones'
];

export const getRewardIcon = (name: string, className: string = "w-6 h-6") => {
  switch(name) {
    case 'Monitor': return <Monitor className={className}/>;
    case 'Pizza': return <Pizza className={className}/>;
    case 'Bot': return <Bot className={className}/>;
    case 'Rocket': return <Rocket className={className}/>;
    case 'Ticket': return <Ticket className={className}/>;
    case 'IceCream': return <IceCream className={className}/>;
    case 'Star': return <Star className={className}/>;
    case 'Heart': return <Heart className={className}/>;
    case 'Gamepad': return <Gamepad2 className={className}/>;
    case 'Music': return <Music className={className}/>;
    case 'Camera': return <Camera className={className}/>;
    case 'Bike': return <Bike className={className}/>;
    case 'Trophy': return <Trophy className={className}/>;
    case 'Zap': return <Zap className={className}/>;
    case 'Crown': return <Crown className={className}/>;
    case 'Palette': return <Palette className={className}/>;
    case 'Sun': return <Sun className={className}/>;
    case 'Moon': return <Moon className={className}/>;
    case 'Umbrella': return <Umbrella className={className}/>;
    case 'Headphones': return <Headphones className={className}/>;
    default: return <Gift className={className}/>;
 }
};

export const INITIAL_SUBJECTS: Subject[] = [
  { 
    id: 's1', 
    name: 'Maths', 
    description: 'Numbers, shapes, data and solving problems.',
    active: true,
    color: 'bg-blue-600', 
    icon: 'Calculator',
    order: 0
  },
  { 
    id: 's2', 
    name: 'English', 
    description: 'Reading comprehension, writing and grammar skills.',
    active: true,
    color: 'bg-sky-500', 
    icon: 'BookOpen',
    order: 1
  },
  { 
    id: 's3', 
    name: 'Verbal Reasoning', 
    description: 'Solving problems using words and letters.',
    active: true,
    color: 'bg-cyan-600', 
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
  // --- MATHS TOPICS ---
  // 1. Number & Place Value
  {
    id: 't-maths-1',
    subjectId: 's1',
    name: 'Number & Place Value',
    description: 'Understanding digits, rounding, and number properties.',
    difficulty: DifficultyLevel.EASY,
    recommendedYear: 'Year 4',
    tags: ['Core', 'Number'],
    order: 0,
    subTopics: [
      { id: 'st-maths-1-1', name: 'Place Value', explanation: 'The value of where a digit is in the number.', learningObjective: 'Identify the value of each digit to millions.', exampleQuestions: ['What is the value of the 7 in 7,452?'], difficulty: DifficultyLevel.EASY, order: 0 },
      { id: 'st-maths-1-2', name: 'Rounding', explanation: 'Making a number simpler but keeping its value close to what it was.', learningObjective: 'Round to nearest 10, 100, 1000.', exampleQuestions: ['Round 5,432 to the nearest 100.'], difficulty: DifficultyLevel.EASY, order: 1 },
      { id: 'st-maths-1-3', name: 'Negative Numbers', explanation: 'Numbers less than zero.', learningObjective: 'Count backwards through zero to include negative numbers.', exampleQuestions: ['What is 5 - 8?'], difficulty: DifficultyLevel.MEDIUM, order: 2 },
      { id: 'st-maths-1-4', name: 'Factors & Multiples', explanation: 'Numbers that divide exactly into another number.', learningObjective: 'Identify factors, multiples and prime numbers.', exampleQuestions: ['List factors of 24.'], difficulty: DifficultyLevel.MEDIUM, order: 3 }
    ]
  },
  // 2. Calculations
  {
    id: 't-maths-2',
    subjectId: 's1',
    name: 'Calculations',
    description: 'Addition, subtraction, multiplication and division skills.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 5',
    tags: ['Core', 'Operations'],
    order: 1,
    subTopics: [
      { id: 'st-maths-2-1', name: 'Written Methods', explanation: 'Using column method for large numbers.', learningObjective: 'Add and subtract numbers with more than 4 digits.', exampleQuestions: ['4532 + 1289'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-maths-2-2', name: 'Long Multiplication', explanation: 'Multiplying multi-digit numbers.', learningObjective: 'Multiply numbers up to 4 digits by a one- or two-digit number.', exampleQuestions: ['342 x 15'], difficulty: DifficultyLevel.HARD, order: 1 },
      { id: 'st-maths-2-3', name: 'BODMAS', explanation: 'The order in which to calculate.', learningObjective: 'Use the order of operations.', exampleQuestions: ['2 + 3 x 4'], difficulty: DifficultyLevel.HARD, order: 2 }
    ]
  },
  // 3. FDP
  {
    id: 't-maths-3',
    subjectId: 's1',
    name: 'Fractions, Decimals & %',
    description: 'Working with parts of a whole.',
    difficulty: DifficultyLevel.HARD,
    recommendedYear: 'Year 5',
    tags: ['Key Concept'],
    order: 2,
    subTopics: [
      { id: 'st-maths-3-1', name: 'Equivalent Fractions', explanation: 'Different fractions that have the same value.', learningObjective: 'Identify, name and write equivalent fractions.', exampleQuestions: ['Write 2/4 in simplest form.'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-maths-3-2', name: 'Adding Fractions', explanation: 'Adding parts together.', learningObjective: 'Add fractions with denominators that are multiples of the same number.', exampleQuestions: ['1/4 + 1/8'], difficulty: DifficultyLevel.HARD, order: 1 },
      { id: 'st-maths-3-3', name: 'Percentages', explanation: 'Parts per 100.', learningObjective: 'Understand percent as number of parts per hundred.', exampleQuestions: ['What is 50% of 80?'], difficulty: DifficultyLevel.MEDIUM, order: 2 }
    ]
  },
  // 4. Ratio
  {
    id: 't-maths-4',
    subjectId: 's1',
    name: 'Ratio & Proportion',
    description: 'Comparing quantities.',
    difficulty: DifficultyLevel.HARD,
    recommendedYear: 'Year 6',
    tags: ['Advanced'],
    order: 3,
    subTopics: [
      { id: 'st-maths-4-1', name: 'Introduction to Ratio', explanation: 'Comparing one part to another.', learningObjective: 'Use ratio language.', exampleQuestions: ['For every 2 red balls there are 3 blue balls.'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-maths-4-2', name: 'Scale Factors', explanation: 'Making shapes larger or smaller.', learningObjective: 'Solve problems involving similar shapes.', exampleQuestions: ['If a side of length 2cm is scaled by 3, what is new length?'], difficulty: DifficultyLevel.HARD, order: 1 }
    ]
  },
  // 5. Algebra
  {
    id: 't-maths-5',
    subjectId: 's1',
    name: 'Algebra',
    description: 'Using letters for numbers.',
    difficulty: DifficultyLevel.HARD,
    recommendedYear: 'Year 6',
    tags: ['Advanced'],
    order: 4,
    subTopics: [
      { id: 'st-maths-5-1', name: 'Simple Formulas', explanation: 'Rules written with letters.', learningObjective: 'Use simple formulae.', exampleQuestions: ['If a = 2, what is 3a?'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-maths-5-2', name: 'Missing Numbers', explanation: 'Finding the unknown value.', learningObjective: 'Express missing number problems algebraically.', exampleQuestions: ['x + 5 = 12'], difficulty: DifficultyLevel.MEDIUM, order: 1 }
    ]
  },
  // 6. Measurement
  {
    id: 't-maths-6',
    subjectId: 's1',
    name: 'Measurement',
    description: 'Length, mass, volume, time and money.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 4',
    tags: ['Practical'],
    order: 5,
    subTopics: [
      { id: 'st-maths-6-1', name: 'Perimeter & Area', explanation: 'Distance around and space inside shapes.', learningObjective: 'Measure and calculate perimeter and area.', exampleQuestions: ['Find area of rectangle 4cm by 5cm.'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-maths-6-2', name: 'Time', explanation: 'Reading clocks and calculating duration.', learningObjective: 'Solve problems involving converting between units of time.', exampleQuestions: ['How many minutes in 1.5 hours?'], difficulty: DifficultyLevel.EASY, order: 1 },
      { id: 'st-maths-6-3', name: 'Converting Units', explanation: 'Changing between mm, cm, m, km etc.', learningObjective: 'Convert between different units of metric measure.', exampleQuestions: ['Convert 1.5kg to grams.'], difficulty: DifficultyLevel.MEDIUM, order: 2 }
    ]
  },
  // 7. Geometry
  {
    id: 't-maths-7',
    subjectId: 's1',
    name: 'Geometry',
    description: 'Shapes, angles and position.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 5',
    tags: ['Visual'],
    order: 6,
    subTopics: [
      { id: 'st-maths-7-1', name: 'Properties of Shapes', explanation: 'Sides, angles, vertices.', learningObjective: 'Compare and classify geometric shapes.', exampleQuestions: ['How many sides does a hexagon have?'], difficulty: DifficultyLevel.EASY, order: 0 },
      { id: 'st-maths-7-2', name: 'Angles', explanation: 'Measuring turn.', learningObjective: 'Know angles are measured in degrees.', exampleQuestions: ['How many degrees in a right angle?'], difficulty: DifficultyLevel.EASY, order: 1 },
      { id: 'st-maths-7-3', name: 'Coordinates', explanation: 'Position on a grid.', learningObjective: 'Describe positions on the full coordinate grid.', exampleQuestions: ['Plot (3, 4).'], difficulty: DifficultyLevel.MEDIUM, order: 2 }
    ]
  },
  // 8. Statistics
  {
    id: 't-maths-8',
    subjectId: 's1',
    name: 'Statistics',
    description: 'Handling data and probability.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 5',
    tags: ['Data'],
    order: 7,
    subTopics: [
      { id: 'st-maths-8-1', name: 'Charts & Graphs', explanation: 'Reading visual data.', learningObjective: 'Interpret and present data using bar charts, pictograms and tables.', exampleQuestions: ['Which group is largest?'], difficulty: DifficultyLevel.EASY, order: 0 },
      { id: 'st-maths-8-2', name: 'Mean Average', explanation: 'The average value.', learningObjective: 'Calculate the mean as an average.', exampleQuestions: ['Find mean of 2, 4, 6.'], difficulty: DifficultyLevel.HARD, order: 1 }
    ]
  },

  // --- ENGLISH TOPICS ---
  {
    id: 't-english-1',
    subjectId: 's2',
    name: 'Comprehension',
    description: 'Understanding and interpreting different types of texts.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 4',
    tags: ['Reading', 'Core'],
    order: 0,
    subTopics: [
      { id: 'st-eng-1-1', name: 'Fact Retrieval', explanation: 'Finding specific details directly stated in the text.', learningObjective: 'Retrieve and record information from non-fiction and fiction.', exampleQuestions: ['According to the first paragraph, what colour was the door?'], difficulty: DifficultyLevel.EASY, order: 0 },
      { id: 'st-eng-1-2', name: 'Inference', explanation: 'Reading between the lines to find hidden meanings.', learningObjective: 'Make inferences from the text using evidence.', exampleQuestions: ['How was the character feeling? Support your answer with evidence.'], difficulty: DifficultyLevel.HARD, order: 1 },
      { id: 'st-eng-1-3', name: 'Word Meaning', explanation: 'Working out what words mean from the sentence around them.', learningObjective: 'Give the meaning of words in context.', exampleQuestions: ['What does the word "sluggish" suggest about the movement?'], difficulty: DifficultyLevel.MEDIUM, order: 2 }
    ]
  },
  {
    id: 't-english-2',
    subjectId: 's2',
    name: 'Grammar',
    description: 'The rules of language, including word types and sentence structure.',
    difficulty: DifficultyLevel.HARD,
    recommendedYear: 'Year 5',
    tags: ['Technical', 'Writing'],
    order: 1,
    subTopics: [
      { id: 'st-eng-2-1', name: 'Word Classes', explanation: 'Nouns, verbs, adjectives, adverbs, and more.', learningObjective: 'Identify and use the main parts of speech.', exampleQuestions: ['Identify the adjective in this sentence.'], difficulty: DifficultyLevel.EASY, order: 0 },
      { id: 'st-eng-2-2', name: 'Sentences', explanation: 'Simple, compound and complex sentences.', learningObjective: 'Use conjunctions to build compound and complex sentences.', exampleQuestions: ['Combine these two sentences using "although".'], difficulty: DifficultyLevel.MEDIUM, order: 1 },
      { id: 'st-eng-2-3', name: 'Active & Passive', explanation: 'Who is doing the action?', learningObjective: 'Identify and convert between active and passive voice.', exampleQuestions: ['Rewrite this sentence in the passive voice.'], difficulty: DifficultyLevel.HARD, order: 2 }
    ]
  },
  {
    id: 't-english-3',
    subjectId: 's2',
    name: 'Punctuation',
    description: 'Using marks to make writing clear.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 5',
    tags: ['Writing', 'Core'],
    order: 2,
    subTopics: [
      { id: 'st-eng-3-1', name: 'Speech Marks', explanation: 'Showing exactly what someone said.', learningObjective: 'Use inverted commas to punctuate direct speech.', exampleQuestions: ['Add the missing speech marks to the sentence.'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-eng-3-2', name: 'Commas', explanation: 'Separating items or clauses.', learningObjective: 'Use commas in lists and after fronted adverbials.', exampleQuestions: ['Where does the comma go in this list?'], difficulty: DifficultyLevel.EASY, order: 1 },
      { id: 'st-eng-3-3', name: 'Apostrophes', explanation: 'Showing possession or missing letters.', learningObjective: 'Use apostrophes for contraction and possession.', exampleQuestions: ['Which is correct: "The dogs bone" or "The dog\'s bone"?'], difficulty: DifficultyLevel.MEDIUM, order: 2 }
    ]
  },
  {
    id: 't-english-4',
    subjectId: 's2',
    name: 'Vocabulary',
    description: 'Expanding word knowledge for exams.',
    difficulty: DifficultyLevel.HARD,
    recommendedYear: 'Year 5',
    tags: ['Verbal', 'Core'],
    order: 3,
    subTopics: [
      { id: 'st-eng-4-1', name: 'Synonyms & Antonyms', explanation: 'Words that mean the same or opposite.', learningObjective: 'Select appropriate synonyms and antonyms.', exampleQuestions: ['Find a word in the text that means "happy".'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-eng-4-2', name: 'Prefixes & Suffixes', explanation: 'Adding beginnings and endings to change meaning.', learningObjective: 'Understand how prefixes and suffixes change word meanings.', exampleQuestions: ['Add a prefix to "happy" to make it mean the opposite.'], difficulty: DifficultyLevel.MEDIUM, order: 1 },
      { id: 'st-eng-4-3', name: 'Homophones', explanation: 'Words that sound same but spelled differently.', learningObjective: 'Distinguish between common homophones (there/their/they\'re).', exampleQuestions: ['Choose the correct spelling: "I (know/no) the answer."'], difficulty: DifficultyLevel.EASY, order: 2 }
    ]
  },
  {
    id: 't-english-5',
    subjectId: 's2',
    name: 'Spelling',
    description: 'Correct spelling rules and patterns.',
    difficulty: DifficultyLevel.MEDIUM,
    recommendedYear: 'Year 4',
    tags: ['Core'],
    order: 4,
    subTopics: [
      { id: 'st-eng-5-1', name: 'Plurals', explanation: 'Making words plural.', learningObjective: 'Apply rules for pluralisation (s, es, ies, ves).', exampleQuestions: ['What is the plural of "baby"?'], difficulty: DifficultyLevel.EASY, order: 0 },
      { id: 'st-eng-5-2', name: 'Silent Letters', explanation: 'Letters written but not heard.', learningObjective: 'Spell words with silent letters (k, g, w, b).', exampleQuestions: ['Spell the word for a knight\'s weapon (sword).'], difficulty: DifficultyLevel.MEDIUM, order: 1 }
    ]
  },
  {
    id: 't-english-6',
    subjectId: 's2',
    name: 'Literary Devices',
    description: 'Techniques writers use to create effect.',
    difficulty: DifficultyLevel.HARD,
    recommendedYear: 'Year 6',
    tags: ['Advanced', 'Reading'],
    order: 5,
    subTopics: [
      { id: 'st-eng-6-1', name: 'Figurative Language', explanation: 'Similes, metaphors and personification.', learningObjective: 'Identify and explain the effect of figurative language.', exampleQuestions: ['Is "The wind howled" a simile or personification?'], difficulty: DifficultyLevel.MEDIUM, order: 0 },
      { id: 'st-eng-6-2', name: 'Alliteration', explanation: 'Repeating starting sounds.', learningObjective: 'Identify alliteration.', exampleQuestions: ['Find the alliteration in "The slithering snake slept."'], difficulty: DifficultyLevel.EASY, order: 1 }
    ]
  }
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
