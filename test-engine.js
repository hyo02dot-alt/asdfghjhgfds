require("dotenv").config({ path: ".env.local" });
const { YoutubeTranscript } = require("youtube-transcript");
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testEngines() {
  console.log("1. 테스트 비디오 자막 추출 시도 (도파민 영상 예시)...");
  try {
    // A random known video with Korean/English captions
    const videoId = "zpOULjyy-n8"; // Example: "GoPro: You in 4K"
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript.slice(0, 5).map(t => t.text).join(" ");
    console.log("✅ 자막 엔진 정상 작동 확인! 샘플 자막:", text);

    console.log("\n2. Gemini AI 요약 엔진 테스트...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent("너는 누구야? 1줄로 대답해봐.");
    console.log("✅ AI 엔진 정상 작동 확인! 대답:", response.response.text().trim());
    
    console.log("\n🚀 모든 백엔드 엔진 100% 정상 작동 검증 완료!");
  } catch (err) {
    console.error("❌ 에러 발생:", err);
  }
}

testEngines();
