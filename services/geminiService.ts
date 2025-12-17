
import { GoogleGenAI, Type } from "@google/genai";
import { Question, AIGeneratedTopic, RoadmapAnalysis } from '../types';

export const getAiClient = () => {
  if (!process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT') {
    console.warn("API_KEY is missing from environment");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });
};

const getMockQuestions = (subjectInput: string | string[], count: number, difficulty: string): Question[] => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `mock-${Date.now()}-${i}`,
      text: `(Mock) Question ${i+1} about ${Array.isArray(subjectInput) ? subjectInput.join(', ') : subjectInput}. Difficulty: ${difficulty}. (AI Unavailable)`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: 0,
      explanation: 'Short explanation placeholder.',
      topic: Array.isArray(subjectInput) ? subjectInput[0] : 'General'
    }));
};

export const generateTestQuestions = async (
  subjectInput: string | string[], 
  topicNames: string[] | null, 
  subTopicNames: string[] = [],
  difficulty: string = "Mixed",
  numberOfQuestions: number = 5,
  isBaseline: boolean = false,
  aiPersona?: string
): Promise<Question[]> => {
  const ai = getAiClient();
  const subjectsString = Array.isArray(subjectInput) ? subjectInput.join(', ') : subjectInput;
  const topicsString = topicNames && topicNames.length > 0 ? topicNames.join(', ') : 'General 11+ curriculum';
  
  if (!ai) {
    return getMockQuestions(subjectInput, numberOfQuestions, difficulty);
  }

  const systemInstruction = aiPersona ? `Important Behavior Rules: ${aiPersona}` : '';

  let prompt = "";
  
  if (isBaseline) {
    prompt = `
      ${systemInstruction}
      Create a comprehensive Baseline Assessment Test for ${subjectsString}.
      Target Audience: Students aged 9-11 (Year 4-6) preparing for 11+ exams.
      Goal: Diagnose the student's current level across a broad range of topics within ${subjectsString}.
      Difficulty: ${difficulty}.
      Number of Questions: ${numberOfQuestions}.
      
      Requirements:
      - Cover varied core topics (e.g., Algebra, Geometry, Number, Data for Maths; Comprehension, Grammar for English).
      - Tag each question with its specific 'topic'.
      - Explanations must be concise (max 30 words).
      - Return valid JSON.
    `;
  } else if (Array.isArray(subjectInput)) {
    // Mock Exam Prompt
    prompt = `
      ${systemInstruction}
      Create a Mock Exam for the 11+ Entrance Examination.
      Subjects to cover: ${subjectsString}.
      Total Questions: ${numberOfQuestions}.
      Difficulty: ${difficulty}.
      Target Audience: 10-11 year olds.
      
      Requirements:
      - Distribute questions evenly among the selected subjects.
      - Ensure questions are challenging and mimic real exam style.
      - Tag each question with the specific 'topic' (e.g. Maths - Algebra, English - Comprehension).
      - Explanations must be concise (max 30 words).
      - Return valid JSON.
    `;
  } else {
    // Normal Subject Test
    prompt = `
      ${systemInstruction}
      Create ${numberOfQuestions} multiple choice questions for ${subjectsString}. 
      Topics: ${topicsString}.
      ${subTopicNames.length > 0 ? `Focus on these subtopics: ${subTopicNames.join(', ')}.` : ''} 
      Difficulty Level: ${difficulty}.
      Target Audience: 10-11 year olds (11+ exam prep).
      Ensure questions are challenging but appropriate.
      Explanations must be concise (max 30 words).
      Return valid JSON.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "4 possible answers"
              },
              correctAnswerIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" },
              explanation: { type: Type.STRING, description: "Brief explanation (max 30 words)" },
              topic: { type: Type.STRING, description: "The specific topic (e.g. Algebra, Geometry)" }
            },
            required: ["text", "options", "correctAnswerIndex", "explanation", "topic"]
          }
        }
      }
    });

    if (response.text) {
      const parsedData = JSON.parse(response.text);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
          return parsedData.map((q: any, index: number) => ({
            ...q,
            id: `gen-${Date.now()}-${index}`
          }));
      }
    }
    throw new Error("Invalid or empty response from Gemini");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    // Fallback to mock questions if AI fails, so user flow isn't broken
    return getMockQuestions(subjectInput, numberOfQuestions, difficulty);
  }
};

export const generateCurriculum = async (
  subjectName: string,
  userPrompt: string,
  aiPersona?: string
): Promise<AIGeneratedTopic[] | null> => {
  const ai = getAiClient();
  
  if (!ai) {
    // Mock Response for Demo when API Key is missing
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            name: "Mock: " + userPrompt.slice(0, 15) + " Basics",
            description: "A generated topic based on your input.",
            difficulty: "Medium",
            recommendedYear: "Year 5",
            isSelected: true,
            subTopics: [
              {
                name: "Introduction to Concept",
                explanation: "This is a simple explanation for students.",
                learningObjective: "Understand the core concept.",
                exampleQuestions: ["What is it?"],
                difficulty: "Easy"
              }
            ]
          }
        ]);
      }, 1500);
    });
  }

  const systemInstruction = aiPersona ? `Important Behavior Rules: ${aiPersona}` : '';

  const prompt = `
    ${systemInstruction}
    You are an expert 11+ exam curriculum developer for the UK education system.
    Subject: ${subjectName}
    Context/Prompt: "${userPrompt}"
    
    Task: Create a structured list of TOPICS and SUBTOPICS based on the prompt.
    Audience: Students aged 9-11 (Years 4, 5, 6).
    Requirements: Return valid JSON array of Topics.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
              recommendedYear: { type: Type.STRING },
              subTopics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    learningObjective: { type: Type.STRING },
                    exampleQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
                  },
                  required: ["name", "explanation", "learningObjective", "exampleQuestions", "difficulty"]
                }
              }
            },
            required: ["name", "description", "difficulty", "recommendedYear", "subTopics"]
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed.map((t: any) => ({ ...t, isSelected: true }));
    }
    return null;

  } catch (error) {
    console.error("AI Curriculum Error:", error);
    return null;
  }
};

export const generateRoadmapSuggestion = async (
  subjectName: string,
  performanceData: { topic: string; score: number; total: number }[],
  aiPersona?: string
): Promise<RoadmapAnalysis | null> => {
  const ai = getAiClient();

  // Mock if no API key
  if (!ai) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          strengths: ["Basic Arithmetic", "Simple Shapes"],
          weaknesses: ["Algebra", "Complex Fractions"],
          recommendedTopics: [
            { topic: "Algebra Basics", duration: "45 mins" }, 
            { topic: "Fraction Operations", duration: "30 mins" }, 
            { topic: "Word Problems", duration: "1 hour" }
          ],
          summary: "Based on the test, the student has a good grasp of fundamentals but struggles with abstract concepts like Algebra."
        });
      }, 2000);
    });
  }

  const systemInstruction = aiPersona ? `Important Behavior Rules: ${aiPersona}` : '';

  const prompt = `
    ${systemInstruction}
    Analyze the following baseline test performance for an 11+ student in ${subjectName}.
    
    Performance Data:
    ${JSON.stringify(performanceData, null, 2)}
    
    Task:
    1. Identify key strengths and weaknesses based on the scores.
    2. Recommend a prioritized list of topics to focus on next (Roadmap).
    3. For each recommended topic, estimate the study time required (e.g., '30 mins', '1 hour').
    4. Provide a brief, encouraging summary for the parent/teacher.
    
    Return valid JSON matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedTopics: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: {
                  topic: { type: Type.STRING },
                  duration: { type: Type.STRING }
                },
                required: ["topic", "duration"]
              } 
            },
            summary: { type: Type.STRING }
          },
          required: ["strengths", "weaknesses", "recommendedTopics", "summary"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;

  } catch (error) {
    console.error("Roadmap Generation Error:", error);
    return null;
  }
};
