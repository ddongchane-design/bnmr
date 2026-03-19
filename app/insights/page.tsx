import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Link from "next/link";

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
}

function getAllPosts(): PostMeta[] {
  const postsDir = path.join(process.cwd(), "posts");
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  const posts = files.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(postsDir, filename), "utf-8");
    const { data } = matter(raw);
    return {
      slug,
      title: data.title ?? slug,
      date: data.date ?? "",
      description: data.description ?? "",
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const metadata = {
  title: "Insights | BMNR Dashboard",
  description: "BMNR 투자 인사이트 및 분석 글 모음",
};

export default function InsightsPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white">
      {/* 상단 내비게이션 */}
      <div className="border-b border-gray-800 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-end gap-3 text-xs text-gray-500">
          <Link href="/glossary" className="hover:text-gray-300 transition-colors">BMNR 용어 사전</Link>
          <span className="text-gray-700">|</span>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">개인정보처리방침</Link>
          <span className="text-gray-700">|</span>
          <Link href="/terms" className="hover:text-gray-300 transition-colors">이용약관 및 면책조항</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* 헤더 */}
        <div className="mb-12">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block">
            ← 대시보드 홈으로
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Insights</h1>
          <p className="mt-2 text-gray-400 text-sm">BMNR 투자 인사이트 및 크립토 자산 분석</p>
        </div>

        {/* 포스트 카드 목록 */}
        {posts.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 게시물이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/insights/${post.slug}`}>
                  <div className="group bg-[#13131e] border border-white/5 rounded-xl p-6 hover:border-white/15 hover:bg-[#16162a] transition-all duration-200 cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-gray-500 tracking-widest uppercase">
                        {post.date}
                      </span>
                      <span className="text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">
                        Insight
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors leading-snug mb-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
                      {post.description}
                    </p>
                    <div className="mt-4 text-xs text-gray-600 group-hover:text-blue-400 transition-colors">
                      읽기 →
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 푸터 */}
      <footer className="mt-16 pt-8 border-t border-gray-800">
        <div className="max-w-3xl mx-auto px-6 pb-10 flex justify-center text-sm text-gray-500">
          <p>© 2026 BMNR Unofficial Dashboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
