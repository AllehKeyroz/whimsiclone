import { GoogleGenAI, Type } from "@google/genai";
import { NodeType, NodeColor, ShapeType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GeneratedNode {
  text: string;
  type: 'concept' | 'detail';
}

export interface GeneratedMindMap {
  topic: string;
  subTopics: GeneratedNode[];
}

export const generateMindMapData = async (topic: string): Promise<GeneratedMindMap | null> => {
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