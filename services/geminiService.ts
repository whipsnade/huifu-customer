import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UrgencyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Shared schema for consistency
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    urgency: { type: Type.STRING, enum: [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH, UrgencyLevel.CRITICAL] },
    category: { type: Type.STRING }
  },
  required: ["title", "description", "urgency", "category"]
};

export const analyzeRepairImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const model = 'gemini-2.5-flash-image';
    
    // Remove data URL prefix if present for the API call
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg', 
            },
          },
          {
            text: `分析这张物业维修应用的照片。
                   识别照片中显示的损坏或维修问题。
                   返回一个结构化的 JSON 响应，包含简短的中文标题、问题的简洁中文描述、紧急程度（一般、中等、紧急、严重）以及一般类别（例如：水管、电力、暖通空调、结构）。`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing image:", error);
    return {
      title: "无法识别",
      description: "无法自动分析图片，请手动添加详细信息。",
      urgency: UrgencyLevel.MEDIUM,
      category: "其他"
    };
  }
};

export const analyzeRepairAudio = async (base64Audio: string): Promise<AnalysisResult> => {
  try {
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    
    // Clean base64 string (remove data:audio/webm;base64, prefix if present)
    const cleanBase64 = base64Audio.split(',')[1] || base64Audio;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              // We assume standard web audio recording format here, usually webm or mp4 depending on browser
              mimeType: 'audio/webm', 
            },
          },
          {
            text: `听取这段物业维修应用的语音报告。
                   提取描述的维修问题。
                   返回一个结构化的 JSON 响应，包含简短的中文标题（例如：“空调漏水”）、基于语音内容的简洁中文描述、推断的紧急程度以及类别。`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing audio:", error);
    return {
      title: "语音报告",
      description: "无法转录音频。请检查网络连接或重试。",
      urgency: UrgencyLevel.MEDIUM,
      category: "其他"
    };
  }
};