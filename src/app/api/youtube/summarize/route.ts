import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { videoId, channelIds, manualUrl, customPrompt } = await req.json();
    let targetVideoIds = [];
    
    if (manualUrl) {
      const vidMatch = manualUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      if (vidMatch) targetVideoIds.push(vidMatch[1]);
    } else if (videoId) {
      targetVideoIds.push(videoId);
    } else if (channelIds && channelIds.length > 0) {
      for (const chId of channelIds.slice(0, 5)) { // 속도를 위해 상위 5개로 제한
        const uploadsPlaylistId = chId.replace(/^UC/, "UU");
        const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}` } });
        const data = await res.json();
        if (data.items?.[0]) targetVideoIds.push(data.items[0].snippet.resourceId.videoId);
      }
    }

    if (targetVideoIds.length === 0) return NextResponse.json({ error: "영상을 찾을 수 없습니다." }, { status: 404 });

    const results = [];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    for (const vid of targetVideoIds) {
      try {
        const vInfoUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${vid}`;
        const vInfoRes = await fetch(vInfoUrl, { headers: { Authorization: `Bearer ${session.accessToken}` } });
        const vInfoData = await vInfoRes.json();
        const vInfo = vInfoData.items?.[0];
        if (!vInfo) continue;

        const transcript = await YoutubeTranscript.fetchTranscript(vid);
        const fullTranscriptText = transcript.map((t: any) => t.text).join(" ");

        // 자청 스타일 + 호엉이 프롬프트 결합 로직
        const systemPrompt = `
        너는 유튜브 영상의 핵심을 꿰뚫어 보는 고밀도 지식 정제 전문가야. 
        사용자의 프롬프트 지령에 따라 자막 전체 내용을 분석하여 아티클 형태로 재구성해줘.
        
        [출력 스타일 가이드 - 자청의 유튜브 추출기 스타일]
        1. 흥미로운 제목과 이모지를 활용해 시작해줘. (예: 이란-미국 휴전, 진짜 끝난 걸까? 🤔)
        2. 소제목을 활용하여 문단을 논리적으로 나눠줘 (예: 누가 이겼을까? 🤔 승자는 없다!)
        3. 단순 나열이 아니라, 독자에게 이야기하듯 친절하면서도 예리한 통찰을 담아줘.
        4. 영상의 핵심 수치, 인물, 사건을 정확히 짚어줘.
        
        [사용자 추가 지령]
        ${customPrompt || "자막 내용을 바탕으로 지식 밀도가 높은 아티클로 정제해줘."}
        `;

        const prompt = `
        ${systemPrompt}
        
        영상 제목: "${vInfo.snippet.title}"
        원본 자막:
        ${fullTranscriptText.slice(0, 30000)}
        `;

        const aiResponse = await model.generateContent(prompt);
        const refinedText = aiResponse.response.text().trim();

        results.push({
          videoId: vid,
          videoUrl: `https://www.youtube.com/watch?v=${vid}`,
          title: vInfo.snippet.title,
          thumbnail: vInfo.snippet.thumbnails.high?.url,
          channelTitle: vInfo.snippet.channelTitle,
          publishedAt: vInfo.snippet.publishedAt,
          viewCount: vInfo.statistics.viewCount,
          likeCount: vInfo.statistics.likeCount,
          description: vInfo.snippet.description,
          tags: vInfo.snippet.tags || [],
          summary: refinedText,
          transcript: fullTranscriptText
        });
      } catch (e) { console.error(e); }
    }

    return NextResponse.json({ summaries: results });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
