import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      console.error("❌ Unauthorized: No session or access token found.");
      return NextResponse.json({ error: "로그인이 필요합니다. 로그아웃 후 다시 로그인해 주세요." }, { status: 401 });
    }

    const { videoId, channelIds, manualUrl, customPrompt } = await req.json();
    console.log("🚀 Summarize Request Received:", { videoId, manualUrl, channelsCount: channelIds?.length });
    
    let targetVideoIds = [];
    
    if (manualUrl) {
      const vidMatch = manualUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      if (vidMatch) targetVideoIds.push(vidMatch[1]);
    } else if (videoId) {
      targetVideoIds.push(videoId);
    } else if (channelIds && channelIds.length > 0) {
      for (const chId of channelIds.slice(0, 5)) {
        try {
          const uploadsPlaylistId = chId.replace(/^UC/, "UU");
          const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}` } });
          const data = await res.json();
          if (data.items?.[0]) {
            targetVideoIds.push(data.items[0].snippet.resourceId.videoId);
            console.log(`✅ Latest video found for ${chId}: ${data.items[0].snippet.resourceId.videoId}`);
          }
        } catch (e) {
          console.error(`❌ Error fetching playlist for ${chId}:`, e);
        }
      }
    }

    if (targetVideoIds.length === 0) return NextResponse.json({ error: "분석할 영상을 찾을 수 없습니다." }, { status: 404 });

    const results = [];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    for (const vid of targetVideoIds) {
      try {
        console.log(`🎬 Processing video: ${vid}`);
        const vInfoUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${vid}`;
        const vInfoRes = await fetch(vInfoUrl, { headers: { Authorization: `Bearer ${session.accessToken}` } });
        const vInfoData = await vInfoRes.json();
        const vInfo = vInfoData.items?.[0];
        if (!vInfo) {
          console.warn(`⚠️ Video info not found for ${vid}`);
          continue;
        }

        let fullTranscriptText = "";
        try {
          console.log(`🎤 Fetching transcript for ${vid}...`);
          const transcript = await YoutubeTranscript.fetchTranscript(vid);
          fullTranscriptText = transcript.map((t: any) => t.text).join(" ");
          console.log(`✅ Transcript length: ${fullTranscriptText.length}`);
        } catch (e) {
          console.warn(`⚠️ Transcript unavailable for ${vid}, using description instead.`);
          fullTranscriptText = "자막을 가져올 수 없는 영상입니다. 영상 제목과 정보를 바탕으로 추론하여 고밀도 지식으로 요약해 주세요. " + (vInfo.snippet.description || "");
        }

        // 자청 스타일 + 호엉이 프롬프트 결합 로직
        const systemPrompt = `
        너는 유튜브 영상의 핵심을 꿰뚫어 보는 고밀도 지식 정제 전문가야. 
        분석 영상 제목: "${vInfo.snippet.title}"
        
        [출력 스타일 가이드 - 자청의 유튜브 추출기 스타일]
        1. 흥미로운 제목과 이모지를 활용해 시작해줘. (예: 이란-미국 휴전, 진짜 끝난 걸까? 🤔)
        2. 소제목을 활용하여 문단을 논리적으로 나눠줘 (예: 누가 이겼을까? 🤔 승자는 없다!)
        3. 단순 나열이 아니라, 독자에게 이야기하듯 친절하면서도 예리한 통찰을 담아줘.
        4. 영상의 핵심 수치, 인물, 사건을 정확히 짚어줘.
        
        [사용자 추가 지령(페르소나)]
        ${customPrompt || "자막 내용을 바탕으로 지식 밀도가 높은 아티클로 정제해줘."}
        `;

        const prompt = `${systemPrompt}\n\n원본 데이터(자막/설명):\n${fullTranscriptText.slice(0, 30000)}`;

        console.log(`🧠 AI is generating summary for ${vid}...`);
        const aiResponse = await model.generateContent(prompt);
        const refinedText = aiResponse.response.text().trim();

        results.push({
          videoId: vid,
          videoUrl: `https://www.youtube.com/watch?v=${vid}`,
          title: vInfo.snippet.title,
          thumbnail: vInfo.snippet.thumbnails.high?.url || vInfo.snippet.thumbnails.default?.url,
          channelTitle: vInfo.snippet.channelTitle,
          publishedAt: vInfo.snippet.publishedAt,
          viewCount: vInfo.statistics.viewCount,
          likeCount: vInfo.statistics.likeCount,
          description: vInfo.snippet.description,
          tags: vInfo.snippet.tags || [],
          summary: refinedText,
          transcript: fullTranscriptText
        });
        console.log(`✨ Successfully refined: ${vid}`);
      } catch (e: any) { 
        console.error(`❌ Error refining ${vid}:`, e); 
      }
    }

    if (results.length === 0) return NextResponse.json({ error: "정제 과정에서 오류가 발생했습니다." }, { status: 500 });
    return NextResponse.json({ summaries: results });

  } catch (error: any) {
    console.error("🔥 Global API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
