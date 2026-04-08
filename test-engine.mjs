import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "youtube-transcript";
const { YoutubeTranscript } = pkg;
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const videoId = "ggmCuz1KucM"; 

  console.log("🚀 [DEBUG] Video ID:", videoId);
  console.log("🔑 [DEBUG] API Key:", apiKey ? "OK" : "MISSING");

  try {
    console.log("🎤 [DEBUG] Fetching transcript...");
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript.map(t => t.text).join(" ");
    console.log("✅ [DEBUG] Transcript length:", text.length);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("🧠 [DEBUG] Calling Gemini...");
    const prompt = `강력한 지식 정제 전문가로서 다음 자막을 요약해줘:\n\n${text.slice(0, 3000)}`;
    const result = await model.generateContent(prompt);
    
    console.log("✨ [DEBUG] RESPONSE SUCCESS!");
    console.log("--- RESULT ---");
    console.log(result.response.text());
    
  } catch (error) {
    console.error("❌ [DEBUG] ERROR:", error.message);
  }
}

test();
