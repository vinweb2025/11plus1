
import { GoogleGenAI, Type } from "@google/genai";
import { Question, AIGeneratedTopic } from '../types';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing from environment");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateTestQuestions = async (
  subjectName: string, 
  topicName: string | null, 
  subTopicNames: string[] = [],
  difficulty: string = "Mixed",
  numberOfQuestions: number = 5,
  isBaseline: boolean = false
): Promise<Question[]> => {
  const ai = getAiClient();
  
  if (!ai) {
    // Mock for demo
    return Array.from({ length: numberOfQuestions }).map((_, i) => ({
      id: `mock-${Date.now()}-${i}`,
      text: `(Mock ${isBaseline ? 'Baseline' : ''}) Question ${i+1} about ${topicName || subjectName}. Difficulty: ${difficulty}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: 0,
      explanation: 'This is a mock explanation.'
    }));
  }

  let prompt = "";
  
  if (isBaseline) {
    prompt = `
      Create a comprehensive Baseline Assessment Test for ${subjectName}.
      Target Audience: Students aged 9-11 (Year 4-6) preparing for 11+ exams.
      Goal: Diagnose the student's current level across a broad range of topics within ${subjectName}.
      Difficulty: Mixed (Easy to Hard).
      Number of Questions: ${numberOfQuestions}.
      
      Requirements:
      - Cover varied core topics.
      - Return valid JSON.
    `;
  } else {
    prompt = `
      Create ${numberOfQuestions} multiple choice questions for ${subjectName}. 
      Topic: ${topicName || 'General'}. 
      ${subTopicNames.length > 0 ? `Focus on these subtopics: ${subTopicNames.join(', ')}.` : ''} 
      Difficulty Level: ${difficulty}.
      Target Audience: 10-11 year olds (11+ exam prep).
      Ensure questions are challenging but appropriate.
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
              explanation: { type: Type.STRING, description: "Brief explanation of the solution" }
            },
            required: ["text", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });

    if (response.text) {
      const parsedData = JSON.parse(response.text);
      return parsedData.map((q: any, index: number) => ({
        ...q,
        id: `gen-${Date.now()}-${index}`
      }));
    }
    throw new Error("No text returned from Gemini");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return [];
  }
};

export const generateCurriculum = async (
  subjectName: string,
  userPrompt: string
): Promise<AIGeneratedTopic[] | null> => {
  const ai = getAiClient();
  
  if (!ai) {
    // Mock Response for Demo when API Key is missing
    return new Promise(resolve => {
      setTimeout(() => {
        const id = Date.now();
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
              },
              {
                name: "Advanced Application",
                explanation: "Applying the concept in harder problems.",
                learningObjective: "Solve complex problems.",
                exampleQuestions: ["Solve this."],
                difficulty: "Hard"
              }
            ]
          }
        ]);
      }, 1500);
    });
  }

  const prompt = `
    You are an expert 11+ exam curriculum developer for the UK education system.
    Subject: ${subjectName}
    Context/Prompt: "${userPrompt}"
    
    Task: Create a structured list of TOPICS and SUBTOPICS based on the prompt.
    Audience: Students aged 9-11 (Years 4, 5, 6).
    
    Requirements:
    1. Structure the output as a JSON array of Topic objects.
    2. Each Topic must have: name, description, difficulty (Easy/Medium/Hard), recommendedYear.
    3. Each Topic must have a 'subTopics' array.
    4. Each SubTopic must have: name, explanation (kid-friendly), learningObjective, exampleQuestions (array of strings), difficulty.
    
    Ensure the content is high quality and relevant to 11+ exams (Verbal, Non-Verbal, Maths, English).
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
