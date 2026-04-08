"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Loader2, ExternalLink, Settings2, Check, 
  RefreshCw, LogOut, Search, Info, AlignLeft, 
  FileText, MessageSquare, Calendar, ChevronRight, Sparkles, Ghost, Tv, Heart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [channels, setChannels] = useState<any[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaries, setSummaries] = useState<any[]>([]);
  
  const [manualUrl, setManualUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPersonaSettings, setShowPersonaSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    const savedPrompt = localStorage.getItem("ho-eong-persona");
    setCustomPrompt(savedPrompt || "자칭 '지식 세탁기'로서, 엉망인 자막을 읽기 좋은 고품질 지식 아티클로 환골탈태시켜줘.");
    const savedSelection = localStorage.getItem("ho-eong-channels");
    if (savedSelection) setSelectedChannels(new Set(JSON.parse(savedSelection)));
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/youtube/subscriptions")
        .then(res => res.json())
        .then(data => { if (data.channels) setChannels(data.channels); })
        .finally(() => setLoadingChannels(false));
    }
  }, [status]);

  const toggleChannel = (id: string) => {
    const next = new Set(selectedChannels);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedChannels(next);
    localStorage.setItem("ho-eong-channels", JSON.stringify(Array.from(next)));
  };

  const handleRun = async (isManual = false) => {
    if (!isManual && selectedChannels.size === 0) return alert("먼저 채널을 선택해주세요!");
    if (isManual && !manualUrl) return alert("URL을 입력해주세요!");
    
    setIsSummarizing(true);
    setSummaries([]);
    try {
      const res = await fetch("/api/youtube/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          manualUrl: isManual ? manualUrl : null,
          channelIds: isManual ? [] : Array.from(selectedChannels), 
          customPrompt 
        }),
      });
      const data = await res.json();
      if (data.summaries) {
        setSummaries(data.summaries);
        const tabs: Record<string, string> = {};
        data.summaries.forEach((s: any) => tabs[s.videoId] = "ai");
        setActiveTab(tabs);
      } else {
        console.error("API Error Response:", data);
        alert("🚨 에러 발생: " + (data.error || "알 수 없는 오류"));
      }
    } catch (e: any) { 
      console.error("Fetch Exception:", e); 
      alert("🌐 서버 연결 실패: " + e.message);
    }
    finally { setIsSummarizing(false); }
  };

  if (status === "loading" || !session) return <div className="h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-zinc-900 pb-40">
      
      {/* --- 고정 상단바 --- */}
      <header className="bg-white border-b border-zinc-100 h-16 sticky top-0 z-[100] px-6">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black">H</div>
             <span className="font-extrabold tracking-tight">HO-EONG v2</span>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setShowPersonaSettings(!showPersonaSettings)} className="text-[10px] font-black uppercase text-zinc-400 hover:text-black">Persona</button>
             <button onClick={() => signOut()} className="text-[10px] font-black uppercase text-zinc-400 hover:text-red-500">Logout</button>
             <img src={session.user?.image || ""} className="w-8 h-8 rounded-full border border-zinc-100" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* --- [섹션 1: 오늘의 지식 정제 (핵심 자동화)] --- */}
        <section className="space-y-8">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight uppercase">Today's Patrol</h2>
                <p className="text-sm text-zinc-500 font-medium italic">당신이 선택한 {selectedChannels.size}개의 정찰 채널입니다.</p>
              </div>
              <button 
                onClick={() => handleRun(false)}
                disabled={isSummarizing || selectedChannels.size === 0}
                className="h-20 px-12 bg-red-600 text-white font-black rounded-[2rem] shadow-2xl shadow-red-600/30 hover:bg-red-700 active:scale-95 transition-all text-xl flex items-center gap-4"
              >
                {isSummarizing ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
                오늘의 지식 정제 시작
              </button>
           </div>

           {/* 채널 선택 그리드 (영구 고정 선택용) */}
           <div className="bg-white p-1 rounded-[3rem] border border-zinc-100 shadow-xl overflow-hidden">
              <div className="p-8 max-h-[320px] overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 custom-scrollbar">
                {loadingChannels ? (
                  <div className="col-span-full py-20 flex flex-col items-center opacity-30">
                    <Loader2 className="animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Loading channels...</p>
                  </div>
                ) : channels.map(ch => {
                  const id = ch.snippet.resourceId.channelId;
                  const isS = selectedChannels.has(id);
                  return (
                    <div 
                      key={id} 
                      onClick={() => toggleChannel(id)}
                      className={`relative aspect-square rounded-[2.5rem] p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all border ${
                        isS ? "bg-black border-black text-white shadow-xl" : "bg-white border-zinc-50 text-zinc-400 grayscale hover:grayscale-0 hover:border-zinc-200"
                      }`}
                    >
                      <img src={ch.snippet.thumbnails.default.url} className="w-12 h-12 rounded-2xl mb-3 shadow-md border-2 border-white/10" />
                      <span className="text-[10px] font-black truncate w-full px-2 leading-tight">{ch.snippet.title}</span>
                      {isS && <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />}
                    </div>
                  )
                })}
              </div>
              <div className="bg-zinc-50 px-8 py-4 flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selected: {selectedChannels.size}</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-zinc-300 uppercase">On Patrol</span>
                  </div>
                </div>
              </div>
           </div>
        </section>

        {/* 페르소나 설정 (필요할 때만 오픈) */}
        <AnimatePresence>
          {showPersonaSettings && (
            <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
               <div className="bg-zinc-900 text-white p-10 rounded-[3.5rem] space-y-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-red-500 w-5 h-5" />
                    <h4 className="text-sm font-black uppercase tracking-widest">Persona Instruction</h4>
                  </div>
                  <textarea 
                    value={customPrompt}
                    onChange={(e) => {setCustomPrompt(e.target.value); localStorage.setItem("ho-eong-persona", e.target.value);}}
                    className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-6 text-sm text-zinc-300 focus:outline-none min-h-[140px] leading-relaxed transition-all"
                    placeholder="비서의 성격과 결과물의 형식을 자유롭게 지시하세요."
                  />
                  <p className="text-[10px] text-zinc-500 font-medium">✓ 입력 시 즉시 저장되며, 모든 채널 정제 로직에 반영됩니다.</p>
               </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* --- [섹션 2: 수동 분석 (Jachung 스타일)] --- */}
        <section className="bg-zinc-100 p-3 rounded-[3rem] flex flex-col md:flex-row gap-3">
           <div className="flex-1 relative">
             <input 
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="직접 유튜브 URL을 넣어 분석하려면 여기에..." 
              className="w-full h-16 bg-white border border-zinc-200 rounded-[2.2rem] px-8 text-sm focus:outline-none"
             />
             <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
           </div>
           <button 
            onClick={() => handleRun(true)}
            disabled={isSummarizing || !manualUrl}
            className="h-16 px-10 bg-zinc-900 text-white font-black rounded-[2.2rem] hover:bg-black transition-all disabled:opacity-20 flex items-center justify-center gap-2"
           >
             즉시 분석
           </button>
        </section>

        {/* --- [섹션 3: 지식 정제 결과 (Article View)] --- */}
        <section className="space-y-32 py-10">
           {isSummarizing && (
             <div className="py-40 text-center flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-zinc-200 animate-spin mb-6" />
                <p className="text-base font-black text-zinc-400">지식을 고밀도로 압축하고 있습니다...</p>
             </div>
           )}

           {summaries.map((sum) => (
             <article key={sum.videoId} className="bg-white rounded-[4rem] border border-zinc-100 shadow-2xl shadow-zinc-100/50 overflow-hidden">
                <div className="p-10 md:p-20">
                   <header className="mb-12">
                      <div className="flex items-center gap-3 mb-8">
                        <span className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest">{sum.channelTitle}</span>
                        <span className="text-zinc-300">/</span>
                        <span className="text-[10px] font-bold text-zinc-400 italic">Extracted {new Date().toLocaleDateString()}</span>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-black text-zinc-900 leading-[1.1] tracking-tighter italic">"{sum.title}"</h1>
                      
                      <div className="flex gap-10 mt-10 p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-100">
                         <div><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Views</p><p className="text-sm font-black">{parseInt(sum.viewCount).toLocaleString()}</p></div>
                         <div><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Likes</p><p className="text-sm font-black">{parseInt(sum.likeCount).toLocaleString()}</p></div>
                         <a href={sum.videoUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs font-black text-red-500 flex items-center gap-1 underline underline-offset-4">Source <ExternalLink className="w-4 h-4" /></a>
                      </div>
                   </header>

                   <div className="flex bg-zinc-100 p-1.5 rounded-[2.2rem] mb-12">
                      {[ { id: "ai", label: "AI 정리", icon: Sparkles }, { id: "script", label: "자막 원본", icon: AlignLeft }, { id: "info", label: "정보", icon: Info } ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab({...activeTab, [sum.videoId]: t.id})}
                          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.8rem] text-[11px] font-black uppercase transition-all ${
                            activeTab[sum.videoId] === t.id ? "bg-white text-black shadow-lg" : "text-zinc-400 hover:text-zinc-600"
                          }`}
                        >
                          <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                      ))}
                   </div>

                   <div className="min-h-[400px]">
                      <AnimatePresence mode="wait">
                         {activeTab[sum.videoId] === "ai" && (
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl leading-[1.9] text-zinc-800 font-medium whitespace-pre-wrap selection:bg-red-50">
                              {sum.summary}
                           </motion.div>
                         )}
                         {activeTab[sum.videoId] === "script" && (
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm leading-relaxed text-zinc-400 whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono">
                              {sum.transcript}
                           </motion.div>
                         )}
                         {activeTab[sum.videoId] === "info" && (
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                              <img src={sum.thumbnail} className="w-full rounded-[2.5rem]" />
                              <p className="text-sm text-zinc-500 leading-relaxed">{sum.description}</p>
                           </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                </div>

                <div className="p-10 bg-[#050505] text-white">
                   <div className="flex items-center gap-3 mb-6">
                      <MessageSquare className="w-5 h-5 text-red-500 fill-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Context Chat <span className="text-[#050505] bg-red-500 px-1 rounded ml-1">BETA</span></span>
                   </div>
                   <input 
                    placeholder="이 지식에 대해 궁금한 점을 질문해 보세요..."
                    className="w-full h-16 bg-white/5 border border-white/10 rounded-[2rem] px-8 text-sm focus:outline-none focus:bg-white/10 transition-all"
                   />
                </div>
             </article>
           ))}
        </section>
      </main>
    </div>
  );
}
