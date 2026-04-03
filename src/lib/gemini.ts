import { GoogleGenAI, Type } from "@google/genai";
import { GeminiExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractReceiptData(base64Image: string, mimeType: string): Promise<GeminiExtractionResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Extract the following information from this receipt image:
- No (Receipt number or Invoice number)
- Description (Summary of items or store name)
- Final Amount (The total amount to be paid)
- Date (The date of the transaction in YYYY-MM-DD format if possible, otherwise as seen)

Return the data in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          no: { type: Type.STRING, description: "Receipt or Invoice number" },
          description: { type: Type.STRING, description: "Brief description or store name" },
          finalAmount: { type: Type.NUMBER, description: "Total amount" },
          date: { type: Type.STRING, description: "Transaction date" },
        },
        required: ["no", "description", "finalAmount", "date"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as GeminiExtractionResult;
}
