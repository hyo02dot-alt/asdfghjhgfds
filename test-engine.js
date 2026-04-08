const { GoogleGenerativeAI } = require("@google/generative-ai");
const { YoutubeTranscript } = require("youtube-transcript");
require("dotenv").config({ path: ".env.local" });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const videoId = "ggmCuz1KucM"; // 호엉이님이 입력하셨던 그 영상!

  console.log("🚀 Testing logic for video:", videoId);
  console.log("🔑 API Key check:", apiKey ? "OK" : "MISSING");

  try {
    console.log("🎤 Fetching transcript...");
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript.map(t => t.text).join(" ");
    console.log("✅ Transcript fetched! length:", text.length);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("🧠 Asking Gemini to refine...");
    const prompt = `다음 유튜브 자막을 자청의 유튜브 추출기 스타일로 요약해줘:\n\n${text.slice(0, 5000)}`;
    const result = await model.generateContent(prompt);
    
    console.log("✨ Gemini Response Success!");
    console.log("--- RESULT PREVIEW ---");
    console.log(result.response.text().slice(0, 500) + "...");
    
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
  }
}

test();
