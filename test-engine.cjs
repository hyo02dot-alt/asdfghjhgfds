const { GoogleGenerativeAI } = require("@google/generative-ai");
const { YoutubeTranscript } = require("youtube-transcript");
require("dotenv").config({ path: ".env.local" });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const videoId = "ggmCuz1KucM"; 

  console.log("🚀 [FINAL TEST] Video:", videoId);
  console.log("🔑 [FINAL TEST] API Key:", apiKey ? "Loaded" : "MISSING");

  try {
    console.log("🎤 [FINAL TEST] YouTube Script Fetching...");
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript.map(t => t.text).join(" ");
    console.log("✅ [FINAL TEST] Script Size:", text.length);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("🧠 [FINAL TEST] Gemini AI working...");
    const result = await model.generateContent("Hello, say 'I am alive and ready'.");
    console.log("✨ [FINAL TEST] Gemini Says:", result.response.text());

    const summary = await model.generateContent(`유튜브 요약해줘:\n\n${text.slice(0, 2000)}`);
    console.log("📝 [FINAL TEST] Summary Success!");
    console.log(summary.response.text().slice(0, 500));
    
  } catch (error) {
    console.error("❌ [FINAL TEST] FAILED:", error.message);
  }
}

test();
