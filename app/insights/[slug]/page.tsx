import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Props {
  params: Promise<{ slug: string }>;
}

function getPost(slug: string) {
  const filePath = path.join(process.cwd(), "posts", `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { title: data.title ?? slug, date: data.date ?? "", description: data.description ?? "", content };
}

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), "posts");
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));
  return files.map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

const SITE_URL = "https://bnmr.vercel.app";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `${SITE_URL}/insights/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      siteName: "BMNR Dashboard",
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function InsightDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "BMNR Dashboard", url: SITE_URL },
    publisher: { "@type": "Organization", name: "BMNR Dashboard", url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/insights/${slug}` },
  };

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
        {/* 뒤로 가기 */}
        <Link href="/insights" className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-8 inline-block">
          ← Insights 목록으로
        </Link>

        {/* 포스트 헤더 */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">Insight</span>
            <span className="text-[11px] font-mono text-gray-500">{post.date}</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-snug mb-3">{post.title}</h1>
          <p className="text-gray-400 text-sm leading-relaxed">{post.description}</p>
        </div>

        <div className="border-t border-white/5 mb-10" />

        {/* 본문 */}
        <article className="
          text-gray-300 leading-[1.85] text-[15px]
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white/80 [&_h3]:mt-7 [&_h3]:mb-3
          [&_p]:mb-5
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-5 [&_ul]:space-y-1.5
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-5 [&_ol]:space-y-1.5
          [&_li]:text-gray-300
          [&_strong]:text-white [&_strong]:font-semibold
          [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-gray-400 [&_blockquote]:italic [&_blockquote]:my-6
          [&_code]:bg-white/5 [&_code]:text-blue-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px] [&_code]:font-mono
          [&_pre]:bg-[#13131e] [&_pre]:border [&_pre]:border-white/5 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:mb-5
          [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-gray-300
          [&_table]:w-full [&_table]:border-collapse [&_table]:mb-6
          [&_th]:text-left [&_th]:text-xs [&_th]:text-gray-400 [&_th]:uppercase [&_th]:tracking-widest [&_th]:border-b [&_th]:border-white/10 [&_th]:pb-2 [&_th]:pr-6
          [&_td]:py-2.5 [&_td]:pr-6 [&_td]:border-b [&_td]:border-white/5 [&_td]:text-sm
          [&_hr]:border-white/5 [&_hr]:my-8
          [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-300
        ">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </article>

        <div className="border-t border-white/5 mt-12 pt-8">
          <Link href="/insights" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← 목록으로 돌아가기
          </Link>
        </div>
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
