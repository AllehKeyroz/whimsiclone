import { GoogleGenAI, Type } from "@google/genai";
import { NodeType, NodeColor, ShapeType } from '../types';

// Use import.meta.env for Vite or fallback to empty string to prevent crash
const apiKey = (import.meta as any).env?.VITE_API_KEY || '';
// Note: GoogleGenAI throws if apiKey is missing in some versions, or might fail later.
// We should lazy load or handle it.

let ai: GoogleGenAI | null = null;
try {
    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
    }
} catch (e) {
    console.warn("AI Service disabled:", e);
}

export interface GeneratedNode {
  text: string;
  type: 'concept' | 'detail';
}

export interface GeneratedMindMap {
  topic: string;
  subTopics: GeneratedNode[];
}

export const generateMindMapData = async (topic: string): Promise<GeneratedMindMap | null> => {
  if (!ai) {
      console.warn("AI service not initialized (missing API Key)");
      return null;
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a breakdown of the topic "${topic}" for a visual mind map. Return a root topic and 4-6 direct sub-concepts (subTopics).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: "The refined main topic text" },
            subTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["concept", "detail"] }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as GeneratedMindMap;

  } catch (error) {
    console.error("Failed to generate mind map:", error);
    return null;
  }
};