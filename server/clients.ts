import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
