import { GoogleGenAI, Type } from "@google/genai";
import { Staff, Shift, DayConfig } from '../types';

// Helper to sanitize JSON response
const cleanJsonResponse = (text: string): string => {
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  }
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  return cleanText.trim();
};

export const analyzeRoster = async (
  staff: Staff[],
  shifts: Shift[],
  days: DayConfig[]
): Promise<{ insights: string[], score: number, cost: number }> => {
  
  if (!process.env.API_KEY) {
    console.warn("API Key missing, returning mock analysis");
    return {
      insights: ["API Key missing. Please provide a key for real AI analysis.", "Using local heuristics for now."],
      score: 75,
      cost: 0
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare data for the prompt
  const rosterData = {
    staff: staff.map(s => ({ name: s.name, role: s.role, rate: s.hourlyRate })),
    schedule: days.map(day => {
      const dailyShifts = shifts.filter(s => s.date === day.date && s.type !== 'OFF');
      return {
        date: day.date,
        day: day.dayName,
        busy: day.isBusy,
        shifts: dailyShifts.map(s => {
          const person = staff.find(st => st.id === s.staffId);
          return { person: person?.name, type: s.type };
        })
      };
    })
  };

  const prompt = `
    Analyze this shift schedule for a restaurant.
    Data: ${JSON.stringify(rosterData)}
    
    Provide:
    1. A list of 3-4 short, bullet-point insights (positive or warning). Example: "Friday is understaffed", "Good skill balance".
    2. A fairness score (0-100).
    3. Estimated total labor cost (assume Morning=6h, Evening=6h, Full=9h).
    
    Return purely JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            score: { type: Type.NUMBER },
            cost: { type: Type.NUMBER }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(cleanJsonResponse(text));

  } catch (error) {
    console.error("Gemini analysis failed", error);
    return {
      insights: ["AI Service unavailable. Please check logs."],
      score: 0,
      cost: 0
    };
  }
};
