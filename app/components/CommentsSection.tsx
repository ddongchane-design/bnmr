"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export type Comment = {
  id: string;
  created_at: string;
  user_name: string;
  content: string;
};

function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createClient(url, key);
}

function formatDate(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)    return "방금 전";
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function CommentsSection({
  initialComments,
}: {
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [userName, setUserName]  = useState("");
  const [content, setContent]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]        = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = userName.trim();
    const text = content.trim();

    if (!name)          { setError("닉네임을 입력해 주세요.");            return; }
    if (!text)          { setError("댓글 내용을 입력해 주세요.");          return; }
    if (name.length > 30)  { setError("닉네임은 30자 이하로 입력해 주세요."); return; }
    if (text.length > 500) { setError("댓글은 500자 이하로 입력해 주세요."); return; }

    setError(null);
    setSubmitting(true);
    try {
      const supabase = createBrowserClient();
      const { data, error: err } = await supabase
        .from("comments")
        .insert({ user_name: name, content: text })
        .select()
        .single();
      if (err) throw err;
      setComments((prev) => [data as Comment, ...prev]);
      setContent("");
    } catch {
      setError("댓글 등록에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-white/5">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 mb-6">
        <h2 className="text-sm font-semibold text-white/80">방문자 댓글</h2>
        <span className="text-[10px] text-white/25 font-mono bg-white/5 border border-white/[0.06] px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </div>

      {/* ── 작성 폼 ── */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#13131e] border border-white/5 rounded-xl p-5 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="text"
            placeholder="닉네임"
            value={userName}
            onChange={(e) => { setUserName(e.target.value); setError(null); }}
            maxLength={30}
            className="w-full sm:w-40 bg-[#0a0a0f] border border-white/8 rounded-lg px-3 py-2 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
          />
          <div className="hidden sm:flex items-center text-[10px] text-white/15 font-mono">
            {userName.length}/30
          </div>
        </div>

        <textarea
          placeholder="대시보드에 대한 의견이나 투자 인사이트를 남겨주세요..."
          value={content}
          onChange={(e) => { setContent(e.target.value); setError(null); }}
          rows={3}
          maxLength={500}
          className="w-full bg-[#0a0a0f] border border-white/8 rounded-lg px-3 py-2.5 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors resize-none mb-3"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[10px] text-white/20 font-mono">
            {content.length}<span className="text-white/10">/500</span>
          </span>
          <div className="flex items-center gap-3 ml-auto">
            {error && (
              <span className="text-[11px] text-rose-400/80">{error}</span>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="bg-violet-600/70 hover:bg-violet-600 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-white/30 border-t-white/80 rounded-full animate-spin" />
                  등록 중...
                </span>
              ) : "댓글 남기기"}
            </button>
          </div>
        </div>
      </form>

      {/* ── 댓글 목록 ── */}
      {comments.length === 0 ? (
        <div className="py-14 text-center">
          <div className="text-2xl mb-2 opacity-20">💬</div>
          <p className="text-xs text-white/20">첫 번째 댓글을 남겨보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-[#13131e] border border-white/5 rounded-xl p-4 hover:border-white/[0.09] transition-colors"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  {/* 아바타 이니셜 */}
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0">
                    {c.user_name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-xs font-semibold text-white/70">
                    {c.user_name}
                  </span>
                </div>
                <span className="text-[10px] text-white/20 font-mono">
                  {formatDate(c.created_at)}
                </span>
              </div>
              <p className="text-xs text-white/55 leading-relaxed pl-8">
                {c.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
