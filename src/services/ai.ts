import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface AIAnalysisResult {
  incidentType: string;
  severityScore: number; // 1-10
  confidenceScore: number; // 0-100
  summary: string;
  cues: string[];
  corroboratingEvidence?: string[];
  nearbyPlaces?: string[];
}

export async function analyzeIncident(
  description: string,
  base64Image?: string,
  mimeType?: string,
  latitude?: number,
  longitude?: number
): Promise<AIAnalysisResult> {
  const parts: any[] = [{ text: `Analyze this incident report from Port Harcourt, Rivers State. Description: ${description}` }];
  
  if (base64Image && mimeType) {
    parts.push({
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    });
  }

  // 1. Basic Analysis (Type, Severity, Cues, Confidence)
  const analysisResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          incidentType: { type: Type.STRING, description: "e.g., Accident, Fire, Crime, Medical, Other" },
          severityScore: { type: Type.NUMBER, description: "Severity from 1 to 10" },
          confidenceScore: { type: Type.NUMBER, description: "Confidence from 0 to 100 based on details provided" },
          summary: { type: Type.STRING, description: "A short summary of the incident" },
          cues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key extracted cues (e.g., 'spill detected', 'visible casualties')" },
        },
        required: ["incidentType", "severityScore", "confidenceScore", "summary", "cues"],
      },
    },
  });

  let result: AIAnalysisResult;
  try {
    result = JSON.parse(analysisResponse.text || "{}");
  } catch (e) {
    result = {
      incidentType: "Unknown",
      severityScore: 5,
      confidenceScore: 50,
      summary: "Failed to parse AI response.",
      cues: [],
    };
  }

  // 2. Search Grounding (Simulate Cloud Scraping for corroborating evidence)
  try {
    const searchResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for recent news or social media reports about: ${result.summary} in Port Harcourt, Rivers State. Summarize any corroborating evidence found.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      result.corroboratingEvidence = chunks
        .filter((c: any) => c.web?.title || c.web?.uri)
        .map((c: any) => `${c.web?.title} - ${c.web?.uri}`);
      
      // Boost confidence if evidence found
      if (result.corroboratingEvidence.length > 0) {
        result.confidenceScore = Math.min(100, result.confidenceScore + 20);
      }
    }
  } catch (e) {
    console.error("Search grounding failed", e);
  }

  // 3. Maps Grounding (Find nearby relevant places like hospitals or police stations if severe)
  if (latitude && longitude && result.severityScore > 5) {
    try {
      const mapsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find nearby emergency services (hospitals, police stations, fire stations) relevant to a ${result.incidentType} incident.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude,
                longitude,
              },
            },
          },
        },
      });

      const mapsChunks = mapsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (mapsChunks && mapsChunks.length > 0) {
        result.nearbyPlaces = mapsChunks
          .filter((c: any) => c.maps?.title || c.maps?.uri)
          .map((c: any) => `${c.maps?.title} - ${c.maps?.uri}`);
      }
    } catch (e) {
      console.error("Maps grounding failed", e);
    }
  }

  return result;
}
