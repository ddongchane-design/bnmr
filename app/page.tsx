import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import YahooFinance from "yahoo-finance2";
const yf = new YahooFinance();
import Link from "next/link";
import PerformanceChart, { ChartPoint } from "./components/PerformanceChart";
import CommentsSection, { type Comment } from "./components/CommentsSection";

// ─── 타입 정의 ────────────────────────────────────────────────
type ETHPrice  = { price: number; change24h: number } | null;
type BTCPrice  = { price: number; change24h: number } | null;
type BMNRPrice = {
  price: number;            // 정규장 종가
  change: number;           // 정규장 변동액
  changePct: number;        // 정규장 변동률
  currentPrice: number;     // postMarket ?? preMarket ?? regular (표시·계산 기준)
  currentChange: number;    // 전일 종가 대비 변동액 (currentPrice 기준)
  currentChangePct: number; // 전일 종가 대비 변동률 (currentPrice 기준)
  priceType: "regular" | "pre-market" | "after-hours";
  preMarketPrice:     number | null;
  preMarketChange:    number | null;
  preMarketChangePct: number | null;
  postMarketPrice:     number | null;
  postMarketChange:    number | null;
  postMarketChangePct: number | null;
  marketState: string | null;
} | null;
type UpdateItem = {
  date: string;      // YYYY-MM-DD
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
  url?: string;
};

// 주식 총 발행량 하드코딩 폴백
const SHARES_OUTSTANDING_FALLBACK = 454_860_000;
const BMNR_PRICE_FALLBACK = 10;
// ETH 매집 목표
const ETH_TOTAL_SUPPLY = 120_000_000;
const ETH_TARGET       = ETH_TOTAL_SUPPLY * 0.05; // 6,000,000 ETH
// SEC EDGAR CIK (BitMine Immersion Technologies)
const BMNR_CIK = "1829311";

// ─── Supabase ─────────────────────────────────────────────────
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) throw new Error("Supabase 환경 변수 없음");
  return createClient(url, key);
}

type SupabaseData = {
  eth_treasury:       number;
  shares_outstanding: number;
  btc_treasury:       number | null;
  cash_holdings:      number | null;
  beast_industries:   number | null;
  eightco_holdings:   number | null;
  staked_eth:         number | null;
  staking_apy:        number | null;
} | null;

async function fetchSupabaseData(): Promise<SupabaseData> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("bmnr_data")
      .select("*")
      .limit(1)
      .single();

    if (error) { console.error("[Supabase]", error.message); return null; }
    if (data?.eth_treasury == null) { console.error("[Supabase] eth_treasury 없음"); return null; }
    return {
      eth_treasury:       Number(data.eth_treasury),
      shares_outstanding: data?.shares_outstanding != null
        ? Number(data.shares_outstanding)
        : SHARES_OUTSTANDING_FALLBACK,
      btc_treasury:     data?.btc_treasury     != null ? Number(data.btc_treasury)     : null,
      cash_holdings:    data?.cash_holdings    != null ? Number(data.cash_holdings)    : null,
      beast_industries: data?.beastIndustries != null ? Number(data.beastIndustries) : null,
      eightco_holdings: data?.eightcoHoldings != null ? Number(data.eightcoHoldings) : null,
      staked_eth:  data?.staked_eth  != null ? Number(data.staked_eth)  : null,
      staking_apy: data?.staking_apy != null ? Number(data.staking_apy) : null,
    };
  } catch (e) { console.error("[Supabase] init 실패:", e); return null; }
}

// ─── 실시간 가격 ──────────────────────────────────────────────

async function fetchETHPrice(): Promise<ETHPrice> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { price: data.ethereum.usd, change24h: data.ethereum.usd_24h_change };
  } catch { return null; }
}

async function fetchBTCPrice(): Promise<BTCPrice> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { price: data.bitcoin.usd, change24h: data.bitcoin.usd_24h_change };
  } catch { return null; }
}

function buildBMNRPrice(
  price: number,
  prevClose: number,
  prePrice: number | null,
  postPrice: number | null,
  marketState: string | null,
): BMNRPrice {
  const currentPrice =
    postPrice != null ? postPrice :
    prePrice  != null ? prePrice  : price;
  const priceType: "regular" | "pre-market" | "after-hours" =
    postPrice != null ? "after-hours" :
    prePrice  != null ? "pre-market"  : "regular";
  const currentChange    = currentPrice - prevClose;
  const currentChangePct = prevClose > 0 ? (currentChange / prevClose) * 100 : 0;
  const preChange     = prePrice  != null ? prePrice  - price : null;
  const preChangePct  = prePrice  != null && price > 0 ? (preChange!  / price) * 100 : null;
  const postChange    = postPrice != null ? postPrice - price : null;
  const postChangePct = postPrice != null && price > 0 ? (postChange! / price) * 100 : null;
  return {
    price,
    change:    price - prevClose,
    changePct: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
    currentPrice, currentChange, currentChangePct, priceType,
    preMarketPrice: prePrice,   preMarketChange: preChange,   preMarketChangePct: preChangePct,
    postMarketPrice: postPrice, postMarketChange: postChange, postMarketChangePct: postChangePct,
    marketState,
  };
}

async function fetchBMNRPrice(): Promise<BMNRPrice> {
  // 1차: yahoo-finance2 (postMarket / preMarket / regular 자동 감지)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = await (yf.quote as any)("BMNR") as {
      regularMarketPrice?: number | null;
      regularMarketPreviousClose?: number | null;
      preMarketPrice?: number | null;
      postMarketPrice?: number | null;
      marketState?: string | null;
    } | null;
    if (quote?.regularMarketPrice) {
      const price     = quote.regularMarketPrice;
      const prevClose = quote.regularMarketPreviousClose ?? price;
      console.log("[yahoo-finance2] 성공:", { price, marketState: quote.marketState });
      return buildBMNRPrice(
        price, prevClose,
        quote.preMarketPrice  ?? null,
        quote.postMarketPrice ?? null,
        quote.marketState     ?? null,
      );
    }
  } catch (e) {
    console.error("[yahoo-finance2] 실패:", e);
  }

  // 2차 폴백: Yahoo Finance chart API (v8)
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/BMNR?interval=1d&range=5d",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) { console.error("[chart API] HTTP", res.status); return null; }
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) { console.error("[chart API] 가격 없음"); return null; }
    const price: number     = meta.regularMarketPrice;
    const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
    console.log("[chart API] 폴백 성공:", { price, prevClose });
    return buildBMNRPrice(
      price, prevClose,
      meta.preMarketPrice  ?? null,
      meta.postMarketPrice ?? null,
      meta.marketState     ?? null,
    );
  } catch (e) {
    console.error("[chart API] 실패:", e);
    return null;
  }
}

// ─── 3개월 과거 데이터 ────────────────────────────────────────

async function fetchBMNRHistorical(): Promise<{ date: string; close: number }[]> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/BMNR?interval=1d&range=3mo",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const data   = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[]     = result.indicators?.quote?.[0]?.close ?? [];
    return timestamps
      .map((ts: number, i: number) => ({
        date:  new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[i],
      }))
      .filter((d) => d.close != null && !isNaN(d.close));
  } catch { return []; }
}

async function fetchETHHistorical(): Promise<{ date: string; price: number }[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=90",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.prices as [number, number][]).map(([ts, price]) => ({
      date: new Date(ts).toISOString().slice(0, 10),
      price,
    }));
  } catch { return []; }
}

// ─── 뉴스 & 공시 페칭 ─────────────────────────────────────────

// 날짜 문자열 파싱 헬퍼 (YYYY-MM-DD 반환)
function tryParseDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

// Bitmine 공식 IR 뉴스 폴백 (스크래핑 실패 시)
const BMNR_NEWS_FALLBACK: UpdateItem[] = [
  {
    date: "2026-03-09",
    title: "Bitmine Immersion Technologies (BMNR) Announces ETH Holdings Reach 4.535 Million Tokens",
    desc: "bitminetech.io · Company News",
    tag: "뉴스",
    tagColor: "bg-blue-500/20 text-blue-400",
    url: "https://www.bitminetech.io/investor-relations",
  },
  {
    date: "2026-03-02",
    title: "Bitmine Immersion Technologies (BMNR) Announces ETH Holdings Reach 4.474 Million Tokens",
    desc: "bitminetech.io · Company News",
    tag: "뉴스",
    tagColor: "bg-blue-500/20 text-blue-400",
    url: "https://www.bitminetech.io/investor-relations",
  },
  {
    date: "2026-02-23",
    title: "Bitmine Immersion Technologies (BMNR) Announces ETH Holdings Reach 4.423 Million Tokens",
    desc: "bitminetech.io · Company News",
    tag: "뉴스",
    tagColor: "bg-blue-500/20 text-blue-400",
    url: "https://www.bitminetech.io/investor-relations",
  },
];

// __NEXT_DATA__ JSON 재귀 탐색
function extractNewsFromJson(obj: unknown, depth = 0): UpdateItem[] {
  if (depth > 10 || obj === null || typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    const candidates = obj.filter(
      (item) => item && typeof item === "object" && !Array.isArray(item) &&
        (item.title || item.headline || item.name) &&
        (item.url || item.href || item.link || item.slug)
    );
    if (candidates.length >= 2) {
      return candidates.slice(0, 8).map((item: Record<string, unknown>) => {
        const title = String(item.title ?? item.headline ?? item.name ?? "").trim();
        let url = String(item.url ?? item.href ?? item.link ?? item.slug ?? "").trim();
        if (url.startsWith("/")) url = "https://www.bitminetech.io" + url;
        if (!url.startsWith("http")) url = "https://www.bitminetech.io/investor-relations";
        const rawDate = String(item.date ?? item.publishedAt ?? item.createdAt ?? item.pubDate ?? "");
        return { date: tryParseDate(rawDate), title, desc: "bitminetech.io · Company News", tag: "뉴스", tagColor: "bg-blue-500/20 text-blue-400", url } as UpdateItem;
      }).filter((it) => it.title.length >= 10);
    }
    for (const item of obj) {
      const found = extractNewsFromJson(item, depth + 1);
      if (found.length >= 2) return found;
    }
    return [];
  }
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort((a, b) =>
    (/news|press|release|article|post|item/i.test(a) ? -1 : 0) -
    (/news|press|release|article|post|item/i.test(b) ? -1 : 0)
  );
  for (const key of keys) {
    const found = extractNewsFromJson(rec[key], depth + 1);
    if (found.length >= 2) return found;
  }
  return [];
}

// Bitmine 공식 IR 뉴스 스크래핑
async function fetchBitmineNews(): Promise<UpdateItem[]> {
  try {
    const res = await fetch("https://www.bitminetech.io/investor-relations", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.warn(`[BitmineNews] HTTP ${res.status} — 폴백 사용`);
      return BMNR_NEWS_FALLBACK;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // __NEXT_DATA__ (Pages Router)
    const nextDataRaw = $("#__NEXT_DATA__").text().trim();
    if (nextDataRaw) {
      try {
        const nextData = JSON.parse(nextDataRaw);
        const items = extractNewsFromJson(nextData);
        if (items.length >= 1) return items.slice(0, 5);
      } catch { /* 무시 */ }
    }

    console.warn("[BitmineNews] 파싱 실패 — 폴백 사용");
    return BMNR_NEWS_FALLBACK;
  } catch (e) {
    console.error("[BitmineNews] 오류:", e);
    return BMNR_NEWS_FALLBACK;
  }
}

// SEC EDGAR 8-K 공시 (BitMine CIK: 1829311)
const SEC_ITEM_NAMES: Record<string, string> = {
  "1.01": "중요 계약 체결",
  "1.02": "계약 종료",
  "2.01": "인수·매각 완료",
  "2.02": "실적 공시",
  "3.02": "주식 발행",
  "5.02": "임원 변경",
  "7.01": "공시 (Reg FD)",
  "8.01": "기타 이벤트",
  "9.01": "재무제표 첨부",
};

async function fetchSECFilings(): Promise<UpdateItem[]> {
  try {
    const res = await fetch(
      `https://data.sec.gov/submissions/CIK${BMNR_CIK.padStart(10, "0")}.json`,
      {
        // SEC EDGAR는 User-Agent 필수 (없으면 403)
        headers: {
          "User-Agent": "BMNR Dashboard contact@bmnrdashboard.com",
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const r = data?.filings?.recent;
    if (!r) return [];

    const forms:       string[] = r.form            ?? [];
    const dates:       string[] = r.filingDate       ?? [];
    const accNums:     string[] = r.accessionNumber  ?? [];
    const items:       string[] = r.items            ?? [];
    const primaryDocs: string[] = r.primaryDocument  ?? [];

    const results: UpdateItem[] = [];
    for (let i = 0; i < forms.length && results.length < 5; i++) {
      if (forms[i] !== "8-K") continue;
      const accRaw   = accNums[i].replace(/-/g, "");
      const fileUrl  = `https://www.sec.gov/Archives/edgar/data/${BMNR_CIK}/${accRaw}/${primaryDocs[i] ?? ""}`;
      const itemCodes = (items[i] ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const itemLabel = itemCodes.map((c: string) => SEC_ITEM_NAMES[c] ?? c).join(" · ") || "중요 공시";
      results.push({
        date:     dates[i],
        title:    `8-K: ${itemLabel}`,
        desc:     `SEC EDGAR 공시`,
        tag:      "SEC",
        tagColor: "bg-violet-500/20 text-violet-400",
        url:      fileUrl,
      });
    }
    return results;
  } catch { return []; }
}

// ─── 차트 데이터 조합 ─────────────────────────────────────────
function buildChartData(
  bmnrRaw: { date: string; close: number }[],
  ethRaw:  { date: string; price: number }[]
): ChartPoint[] {
  if (!bmnrRaw.length || !ethRaw.length) return [];
  const ethMap   = new Map(ethRaw.map((e) => [e.date, e.price]));
  const bmnrBase = bmnrRaw[0].close;
  const ethBase  = ethMap.get(bmnrRaw[0].date) ?? ethRaw[0].price;
  return bmnrRaw.map((b) => {
    const ethPrice = ethMap.get(b.date) ?? null;
    return {
      date:      b.date,
      bmnr:      parseFloat(((b.close / bmnrBase) * 100).toFixed(2)),
      eth:       ethPrice != null ? parseFloat(((ethPrice / ethBase) * 100).toFixed(2)) : null,
      bmnrPrice: parseFloat(b.close.toFixed(2)),
      ethPrice:  ethPrice != null ? parseFloat(ethPrice.toFixed(2)) : null,
    };
  });
}

// ─── 유틸 ────────────────────────────────────────────────────
function fmt(price: number): string {
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}
function fmtCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return fmt(n);
}

// ─── 폴백 정적 업데이트 (뉴스·공시 API 모두 실패 시) ─────────
const STATIC_UPDATES: UpdateItem[] = [
  { date: "2026-03-11", title: "ETH 추가 매입 공시",       desc: "BMNR, 이더리움 추가 취득. ETH 보유량 업데이트.",           tag: "매입",   tagColor: "bg-emerald-500/20 text-emerald-400" },
  { date: "2026-03-08", title: "MAVAN 프로젝트 업데이트",  desc: "MAVAN 1단계 수익 배분 일정 확정. 주주 대상 3월 말 지급 예정.", tag: "공시",   tagColor: "bg-blue-500/20 text-blue-400" },
  { date: "2026-03-05", title: "2월 NAV 발표",             desc: "2월 말 기준 주당 NAV $2.79 확정. mNAV 1.24x 수준 유지.",   tag: "리포트", tagColor: "bg-violet-500/20 text-violet-400" },
  { date: "2026-02-28", title: "ETH 일부 매도",            desc: "유동성 확보 목적으로 ETH 매도. 운영 자금 충당.",           tag: "매도",   tagColor: "bg-rose-500/20 text-rose-400" },
  { date: "2026-02-20", title: "IR 웨비나 개최 예고",      desc: "3월 15일 온라인 IR 진행 예정. ETH 전략 및 MAVAN 현황 공유.", tag: "IR",     tagColor: "bg-amber-500/20 text-amber-400" },
];

const STAKING_MARKET_AVG_APY = 2.84; // 시장 평균 ETH 스테이킹 APY

// ─── 댓글 페칭 ────────────────────────────────────────────────
async function fetchComments(): Promise<Comment[]> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) { console.error("[Comments]", error.message); return []; }
    return (data as Comment[]) ?? [];
  } catch (e) { console.error("[Comments]", e); return []; }
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default async function Home() {
  const [ethData, btcData, bmnrData, bmnrHist, ethHist, supabaseData, newsItems, secItems, initialComments] =
    await Promise.all([
      fetchETHPrice(),
      fetchBTCPrice(),
      fetchBMNRPrice(),
      fetchBMNRHistorical(),
      fetchETHHistorical(),
      fetchSupabaseData(),
      fetchBitmineNews(),
      fetchSECFilings(),
      fetchComments(),
    ]);

  // ── 시가총액 & mNAV ──────────────────────────────────────────
  const bmnrPriceForCalc    = bmnrData?.currentPrice ?? BMNR_PRICE_FALLBACK;
  const sharesOutstanding   = supabaseData?.shares_outstanding ?? SHARES_OUTSTANDING_FALLBACK;
  const ethTreasury         = supabaseData?.eth_treasury ?? null;
  const btcTreasury         = supabaseData?.btc_treasury ?? null;
  const cashHoldings        = supabaseData?.cash_holdings ?? null;
  const beastIndustries     = supabaseData?.beast_industries ?? null;
  const eightcoHoldings     = supabaseData?.eightco_holdings ?? null;
  const stakedEth           = supabaseData?.staked_eth    ?? null;
  const stakingApy          = supabaseData?.staking_apy   ?? null;
  const stakingPct          = stakedEth != null && ethTreasury != null && ethTreasury > 0
    ? (stakedEth / ethTreasury) * 100 : null;
  const annualRevenue       = stakedEth != null && stakingApy != null && ethData?.price != null
    ? stakedEth * (stakingApy / 100) * ethData.price : null;
  const bmnrMarketCap       = bmnrPriceForCalc * sharesOutstanding;
  const usingPriceFallback  = bmnrData === null;
  const usingSharesFallback = supabaseData?.shares_outstanding == null;

  const cryptoNAV = (ethTreasury != null && ethData?.price ? ethTreasury * ethData.price : 0)
                  + (btcTreasury != null && btcData?.price != null ? btcTreasury * btcData.price : 0);
  const mNAV: number | null =
    cryptoNAV > 0
      ? bmnrMarketCap / cryptoNAV
      : null;

  const mNAVValue    = mNAV != null ? `${mNAV.toFixed(2)}x` : "계산 불가";
  const mNAVChange   = mNAV != null ? fmtPct((mNAV - 1) * 100) : "–";
  const mNAVPositive = mNAV != null ? mNAV >= 1 : true;
  const mNAVFailed   = mNAV === null;
  const mNAVSub = (() => {
    if (mNAV != null && ethTreasury != null) {
      const priceTag  = usingPriceFallback  ? " (주가폴백)" : "";
      const sharesTag = usingSharesFallback ? " (발행량폴백)" : "";
      return `시총 ${fmtCompact(bmnrMarketCap)}${priceTag}${sharesTag}`;
    }
    if (supabaseData === null) return "DB 연결 실패 — eth_treasury 없음";
    return "ETH 가격 불러오기 실패";
  })();

  // ── NAV per Share ───────────────────────────────────────────
  const navPerShare: number | null =
    ethTreasury != null && ethData?.price != null && sharesOutstanding > 0
      ? (ethData.price * ethTreasury) / sharesOutstanding
      : null;
  // BMNR 주가 vs NAV 프리미엄/디스카운트 (시간 외 가격 반영)
  const navPremiumPct: number | null =
    navPerShare != null && navPerShare > 0 && bmnrData != null
      ? ((bmnrData.currentPrice - navPerShare) / navPerShare) * 100
      : null;

  // ── ETH 매집 달성률 ─────────────────────────────────────────
  const ethAcqPct: number | null =
    ethTreasury != null ? (ethTreasury / ETH_TARGET) * 100 : null;
  const ethRemaining: number | null =
    ethTreasury != null ? ETH_TARGET - ethTreasury : null;
  const barWidthPct =
    ethAcqPct != null
      ? Math.min(Math.max(ethAcqPct, ethTreasury && ethTreasury > 0 ? 0.15 : 0), 100)
      : 0;

  // ── Total Treasury vs Market Cap ────────────────────────────
  const ethValue  = ethTreasury != null && ethData?.price != null
    ? ethTreasury * ethData.price : null;
  const btcValue  = btcTreasury != null && btcData?.price != null
    ? btcTreasury * btcData.price : null;
  const totalTreasury: number | null =
    ethValue != null
      ? ethValue + (btcValue ?? 0) + (cashHoldings ?? 0) + (beastIndustries ?? 0) + (eightcoHoldings ?? 0)
      : null;
  const treasuryDataAvailable = totalTreasury != null;

  // ── 자산 비중 (자산 비율) ────────────────────────
  const allocationSegments = totalTreasury != null && totalTreasury > 0
    ? [
        { label: "ETH",        value: ethValue       ?? 0, color: "#6366f1" },
        { label: "BTC",        value: btcValue        ?? 0, color: "#fb923c" },
        { label: "Cash",       value: cashHoldings    ?? 0, color: "#4ade80" },
        { label: "Beast Ind.", value: beastIndustries ?? 0, color: "#a855f7" },
        { label: "Eightco",    value: eightcoHoldings ?? 0, color: "#eab308" },
      ]
        .filter((s) => s.value > 0)
        .map((s) => ({ ...s, pct: (s.value / totalTreasury) * 100 }))
    : [];

  // Premium(양수) = MarketCap > Treasury → 고평가
  // Discount(음수) = Treasury > MarketCap → 저평가
  const premiumDiscountPct: number | null =
    treasuryDataAvailable && totalTreasury! > 0
      ? ((bmnrMarketCap - totalTreasury!) / totalTreasury!) * 100
      : null;
  const isPremium = premiumDiscountPct != null && premiumDiscountPct >= 0;

  // 비교 바 — 더 큰 쪽을 100%로 기준
  const maxVal = treasuryDataAvailable
    ? Math.max(bmnrMarketCap, totalTreasury!)
    : 0;
  const marketCapBarPct  = maxVal > 0 ? (bmnrMarketCap / maxVal) * 100 : 0;
  const treasuryBarPct   = maxVal > 0 && totalTreasury != null
    ? (totalTreasury / maxVal) * 100 : 0;

  // ── 업데이트 목록 합산 (뉴스 + SEC, 최신순 8개) ─────────────
  const combinedUpdates: UpdateItem[] =
    newsItems.length > 0 || secItems.length > 0
      ? [...newsItems, ...secItems]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 8)
      : STATIC_UPDATES;

  // ── 차트 데이터 ─────────────────────────────────────────────
  const chartData = buildChartData(bmnrHist, ethHist);
  const bmnrPerf  = chartData.length > 1 && chartData[chartData.length - 1].bmnr != null
    ? (chartData[chartData.length - 1].bmnr! - 100).toFixed(2) : null;
  const ethPerf   = chartData.length > 1 && chartData[chartData.length - 1].eth != null
    ? (chartData[chartData.length - 1].eth! - 100).toFixed(2) : null;

  // KST 현재 시각
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const lastUpdated = now.toISOString().replace("T", " ").substring(0, 16) + " KST";

  // 요약 카드
  const metrics = [
    {
      label: "BMNR 현재 주가",
      value: bmnrData ? fmt(bmnrData.currentPrice) : `${fmt(BMNR_PRICE_FALLBACK)} (폴백)`,
      change: bmnrData ? fmtPct(bmnrData.currentChangePct) : "–",
      changePositive: bmnrData ? bmnrData.currentChangePct >= 0 : true,
      sub: bmnrData
        ? bmnrData.priceType !== "regular"
          ? `정규장 종가 ${fmt(bmnrData.price)}`
          : `전일 대비 ${fmt(bmnrData.change)}`
        : "Yahoo Finance 차단 — 폴백 사용 중",
      icon: "Ξ", isLive: bmnrData !== null, failed: false,
      priceType:  bmnrData?.priceType  ?? null,
      prePrice:   bmnrData?.preMarketPrice   ?? null,
      preChange:  bmnrData?.preMarketChange  ?? null,
      preChangePct: bmnrData?.preMarketChangePct ?? null,
      postPrice:  bmnrData?.postMarketPrice  ?? null,
      postChange: bmnrData?.postMarketChange ?? null,
      postChangePct: bmnrData?.postMarketChangePct ?? null,
    },
    {
      label: "mNAV 비율",
      value: mNAVValue,
      change: mNAVChange,
      changePositive: mNAVPositive,
      sub: mNAVSub,
      icon: "◈", isLive: !mNAVFailed && !usingPriceFallback, failed: mNAVFailed,
      priceType: null, prePrice: null, preChange: null, preChangePct: null,
      postPrice: null, postChange: null, postChangePct: null,
      tooltip: {
        formula: "시가총액 ÷ (ETH 보유량×ETH가격 + BTC 보유량×BTC가격)",
        lines: ["시가총액 = BMNR 현재가 × 총 발행주식수", "1.0 미만 → NAV 대비 할인  /  초과 → 프리미엄"],
      },
    },
    {
      label: "ETH 현재 가격",
      value: ethData ? fmt(ethData.price) : "데이터 불러오기 실패",
      change: ethData ? fmtPct(ethData.change24h) : "–",
      changePositive: ethData ? ethData.change24h >= 0 : true,
      sub: "24시간 변화율", icon: "Ξ", isLive: true, failed: ethData === null,
      priceType: null, prePrice: null, preChange: null, preChangePct: null,
      postPrice: null, postChange: null, postChangePct: null,
    },
    {
      label: "NAV per Share",
      value: navPerShare != null ? fmt(navPerShare) : "계산 불가",
      change: navPremiumPct != null ? `${navPremiumPct >= 0 ? "+" : ""}${navPremiumPct.toFixed(2)}% vs NAV` : "–",
      changePositive: navPremiumPct != null ? navPremiumPct >= 0 : true,
      sub: navPerShare != null ? "ETH 자산 기반 주당 순자산가치" : "ETH 보유량 또는 가격 없음",
      icon: "$", isLive: navPerShare != null, failed: navPerShare === null,
      priceType: null, prePrice: null, preChange: null, preChangePct: null,
      postPrice: null, postChange: null, postChangePct: null,
      tooltip: {
        formula: "(ETH 가격 × ETH 보유량) ÷ 총 발행주식수",
        lines: ["ETH 자산을 주식 1주로 환산한 순자산가치", "프리미엄(%) = (현재가 − NAV/주) ÷ NAV/주 × 100"],
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] font-sans">

      {/* ── Top Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#060e20]/80 backdrop-blur-xl border-b border-[#6d758c]/15 h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-black tracking-tighter text-[#69f6b8]">BMNR</Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/insights" className="text-[#a3aac4] hover:text-[#dee5ff] transition-colors">Insights</Link>
            <Link href="/glossary" className="text-[#a3aac4] hover:text-[#dee5ff] transition-colors">Glossary</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#a3aac4] font-mono hidden sm:block">{lastUpdated}</span>
          <span className="w-2 h-2 rounded-full bg-[#69f6b8] animate-pulse" />
        </div>
      </nav>

      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#091328] flex-col py-6 z-40 hidden md:flex border-r border-[#6d758c]/10">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#69f6b8]/20 flex items-center justify-center">
              <span className="text-[#69f6b8] font-black text-xl">B</span>
            </div>
            <div>
              <div className="text-[#69f6b8] font-black leading-none text-sm">BMNR</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#a3aac4]">Dashboard v1</div>
            </div>
          </div>
        </div>
        <nav className="flex-grow space-y-1 px-3">
          {[
            { label: "Dashboard", icon: "dashboard", href: "/" },
            { label: "Treasury", icon: "account_balance_wallet", href: "#treasury" },
            { label: "Staking", icon: "layers", href: "#staking" },
            { label: "Insights", icon: "auto_stories", href: "/insights" },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="flex items-center gap-3 px-3 py-3 text-[#a3aac4] hover:bg-[#192540]/30 hover:text-[#dee5ff] transition-all rounded-lg group text-[11px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 px-3 border-t border-[#6d758c]/10 pt-4">
          {[
            { label: "Glossary", icon: "menu_book", href: "/glossary" },
            { label: "Privacy", icon: "shield", href: "/privacy" },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="flex items-center gap-3 px-3 py-3 text-[#a3aac4] hover:bg-[#192540]/30 hover:text-[#dee5ff] transition-all rounded-lg text-[11px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="md:ml-64 pt-20 px-6 pb-12 max-w-[calc(100vw)] overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#dee5ff]">Treasury Overview</h1>
            <p className="text-sm text-[#a3aac4] mt-1">비트마인(BMNR) 이더리움 자산 현황 및 핵심 지표 실시간 추적</p>
          </div>
        </div>

        {/* 요약 카드 4개 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={`relative group/card glass-card rounded-xl p-5 hover:bg-[#192540]/60 transition-all overflow-hidden ${m.failed ? "border-rose-500/20" : ""}`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#69f6b8]/5 rounded-full -mr-10 -mt-10 group-hover/card:scale-110 transition-transform" />
              {/* 계산식 툴팁 */}
              {"tooltip" in m && m.tooltip && (
                <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover/card:block w-64">
                  <div className="bg-[#0d1526] border border-[#6d758c]/20 rounded-xl px-3.5 py-3 shadow-2xl shadow-black/60">
                    <div className="text-[9px] text-[#6d758c] font-mono uppercase tracking-widest mb-1.5">계산식</div>
                    <div className="font-mono text-[10px] text-[#a3aac4] bg-[#091328] rounded-md px-2.5 py-1.5 mb-2 leading-snug">
                      {m.tooltip.formula}
                    </div>
                    {m.tooltip.lines.map((line: string, i: number) => (
                      <div key={i} className="text-[10px] text-[#6d758c] leading-relaxed">{line}</div>
                    ))}
                  </div>
                  {/* 말풍선 화살표 */}
                  <div className="flex justify-center">
                    <div className="w-2 h-2 bg-[#0d1526] border-r border-b border-[#6d758c]/20 rotate-45 -mt-1" />
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-[#a3aac4] font-medium uppercase tracking-widest">{m.label}</span>
                <div className="flex items-center gap-1.5">
                  {m.isLive && !m.failed && (
                    <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full tracking-wider">LIVE</span>
                  )}
                  {m.failed && (
                    <span className="text-[9px] font-bold bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full tracking-wider">ERROR</span>
                  )}
                  <span className="text-lg text-[#6d758c]/60">{m.icon}</span>
                </div>
              </div>
              <div className={`font-bold tracking-tight mb-1 ${m.failed ? "text-[#dee5ff]/30 text-lg" : "text-3xl text-[#dee5ff]"}`}>
                {m.value}
              </div>
              {!m.failed ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.changePositive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {m.changePositive ? "▲" : "▼"} {m.change}
                  </span>
                  <span className="text-xs text-[#6d758c]">{m.sub}</span>
                </div>
              ) : (
                <div className="text-xs text-rose-400/60">{m.sub}</div>
              )}
              {/* 시간외 거래 배지 */}
              {m.priceType && m.priceType !== "regular" && (
                <div className="mt-2">
                  <span className="text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-400/80 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                    {m.priceType === "after-hours" ? "After-hours" : "Pre-market"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════
            Total Treasury vs Market Cap 비교 분석
        ══════════════════════════════════════════════════════════ */}
        <div className="relative bg-[#0d1526] border border-[#6d758c]/20 rounded-xl p-6 mb-6 overflow-hidden">
          {/* 배경 그리드 */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* 코너 액센트 — Premium: 황금, Discount: 에메랄드 */}
          <div
            className="absolute top-0 left-0 w-32 h-0.5"
            style={{
              background: isPremium
                ? "linear-gradient(to right, #f59e0b, transparent)"
                : "linear-gradient(to right, #10b981, transparent)",
            }}
          />
          <div
            className="absolute top-0 left-0 w-0.5 h-16"
            style={{
              background: isPremium
                ? "linear-gradient(to bottom, #f59e0b, transparent)"
                : "linear-gradient(to bottom, #10b981, transparent)",
            }}
          />

          <div className="relative">
            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold tracking-widest bg-[#192540]/30 text-[#a3aac4] px-2 py-0.5 rounded-full border border-[#6d758c]/20">
                    VALUATION
                  </span>
                  <h2 className="text-sm font-semibold text-[#dee5ff]/80">Total Treasury vs Market Cap</h2>
                </div>
                <p className="text-xs text-[#6d758c]">
                  실시간 자산 가치와 시가총액을 비교해 고평가·저평가 여부를 판단합니다
                </p>
              </div>

              {/* Premium / Discount 뱃지 */}
              {premiumDiscountPct != null ? (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border shrink-0 ${
                  isPremium
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                }`}>
                  <span className="text-lg">{isPremium ? "▲" : "▼"}</span>
                  <div>
                    <div className="text-xs font-bold tracking-widest uppercase">
                      {isPremium ? "Premium" : "Discount"}
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums leading-tight">
                      {isPremium ? "+" : ""}{premiumDiscountPct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="ml-1 pl-3 border-l border-current/20 text-[10px] text-current/60 leading-relaxed max-w-[100px]">
                    {isPremium ? "시총이 자산보다\n고평가 상태" : "자산이 시총보다\n저평가 상태"}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border shrink-0 bg-[#192540]/20 border-[#6d758c]/20 text-[#6d758c]">
                  <span className="text-sm">–</span>
                  <div className="text-xs">데이터 부족</div>
                </div>
              )}
            </div>

            {/* 비교 바 차트 */}
            <div className="space-y-4 mb-6">
              {/* Market Cap 바 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80" />
                    <span className="text-xs text-[#a3aac4] font-medium">Market Cap (시가총액)</span>
                    {usingPriceFallback && (
                      <span className="text-[9px] text-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 rounded-full">주가 폴백</span>
                    )}
                  </div>
                  <span className="text-sm font-bold font-mono tabular-nums text-[#dee5ff]">
                    {fmtCompact(bmnrMarketCap)}
                  </span>
                </div>
                <div className="relative h-8 bg-[#091328] rounded-lg border border-[#6d758c]/15 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                    style={{ width: `${marketCapBarPct}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 rounded-lg" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-transparent rounded-lg" />
                  </div>
                  {/* 눈금선 */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {[25, 50, 75].map((pct) => (
                      <div
                        key={pct}
                        className="absolute top-0 bottom-0 w-px bg-[#192540]/20"
                        style={{ left: `${pct}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Treasury 바 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
                    <span className="text-xs text-[#a3aac4] font-medium">Total Treasury (총 자산)</span>
                    {!treasuryDataAvailable && (
                      <span className="text-[9px] text-rose-400/60 bg-rose-500/10 px-1.5 py-0.5 rounded-full">데이터 없음</span>
                    )}
                  </div>
                  <span className="text-sm font-bold font-mono tabular-nums text-[#dee5ff]">
                    {totalTreasury != null ? fmtCompact(totalTreasury) : "–"}
                  </span>
                </div>
                <div className="relative h-8 bg-[#091328] rounded-lg border border-[#6d758c]/15 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                    style={{ width: `${treasuryBarPct}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 via-emerald-500 to-emerald-400 rounded-lg" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-transparent rounded-lg" />
                  </div>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {[25, 50, 75].map((pct) => (
                      <div
                        key={pct}
                        className="absolute top-0 bottom-0 w-px bg-[#192540]/20"
                        style={{ left: `${pct}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 자산 비율 — 접기/펼치기 */}
            {allocationSegments.length > 0 && (
              <details className="group mb-5">
                <summary className="flex items-center justify-between cursor-pointer list-none select-none mb-0">
                  <span className="text-[10px] text-[#6d758c] font-mono uppercase tracking-widest">
                    자산 비율
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[#6d758c] font-mono">
                    <span className="hidden group-open:inline">접기</span>
                    <span className="inline group-open:hidden">펼치기</span>
                    <span className="w-4 h-4 rounded border border-[#6d758c]/20 bg-[#192540]/20 flex items-center justify-center text-[9px] font-bold text-[#a3aac4] group-open:rotate-45 transition-transform duration-200">
                      +
                    </span>
                  </span>
                </summary>

                <div className="mt-3">
                  {/* 누적 막대 */}
                  <div className="flex h-5 rounded-full overflow-hidden gap-[1px] bg-[#091328]">
                    {allocationSegments.map((seg) => (
                      <div
                        key={seg.label}
                        className="h-full transition-all duration-700 relative group/seg"
                        style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                      >
                        {/* 호버 툴팁 */}
                        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden group-hover/seg:flex flex-col items-center pointer-events-none z-10">
                          <div className="bg-[#0d1526] border border-[#6d758c]/20 rounded-lg px-2.5 py-1.5 text-[10px] font-mono whitespace-nowrap shadow-xl">
                            <span className="font-bold" style={{ color: seg.color }}>{seg.label}</span>
                            <span className="text-[#a3aac4] ml-1.5">{seg.pct.toFixed(1)}%</span>
                            <span className="text-[#6d758c] ml-1.5">{fmtCompact(seg.value)}</span>
                          </div>
                          <div className="w-1.5 h-1.5 bg-[#0d1526] border-r border-b border-[#6d758c]/20 rotate-45 -mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 범례 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
                    {allocationSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-[10px] text-[#a3aac4] font-mono">{seg.label}</span>
                        <span className="text-[10px] font-bold font-mono" style={{ color: seg.color }}>
                          {seg.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            )}

            {/* Treasury 구성 브레이크다운 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-[#6d758c]/15">
              {/* ETH Value */}
              <div className="bg-[#091328] rounded-lg p-3 border border-[#6d758c]/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">Ξ</span>
                  <span className="text-[10px] text-[#6d758c] font-mono uppercase tracking-widest">ETH</span>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-blue-400">
                  {ethValue != null ? fmtCompact(ethValue) : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] mt-0.5 font-mono">
                  {ethTreasury != null ? `${ethTreasury.toLocaleString()} ETH` : "–"}
                  {ethData?.price != null && (
                    <span className="ml-1 text-[#6d758c]/60">@ {fmtCompact(ethData.price)}</span>
                  )}
                </div>
              </div>

              {/* BTC Value */}
              <div className="bg-[#091328] rounded-lg p-3 border border-[#6d758c]/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base text-orange-400">₿</span>
                  <span className="text-[10px] text-[#6d758c] font-mono uppercase tracking-widest">BTC</span>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-orange-400">
                  {btcValue != null ? fmtCompact(btcValue) : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] mt-0.5 font-mono">
                  {btcTreasury != null ? `${btcTreasury.toLocaleString()} BTC` : "–"}
                  {btcData?.price != null && (
                    <span className="ml-1 text-[#6d758c]/60">@ {fmtCompact(btcData.price)}</span>
                  )}
                </div>
              </div>

              {/* Cash */}
              <div className="bg-[#091328] rounded-lg p-3 border border-[#6d758c]/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base text-green-400">$</span>
                  <span className="text-[10px] text-[#6d758c] font-mono uppercase tracking-widest">Cash</span>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-green-400">
                  {cashHoldings != null ? fmtCompact(cashHoldings) : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] mt-0.5">현금 보유액 (USD)</div>
              </div>

              {/* Beast Industries */}
              <div className="bg-[#091328] rounded-lg p-3 border border-[#6d758c]/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">🦁</span>
                  <span className="text-[10px] text-[#6d758c] font-mono uppercase tracking-widest">Beast Ind.</span>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-purple-400">
                  {beastIndustries != null ? fmtCompact(beastIndustries) : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] mt-0.5">Beast Industries 지분</div>
              </div>

              {/* Eightco Holdings */}
              <div className="bg-[#091328] rounded-lg p-3 border border-[#6d758c]/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base text-sky-400">8</span>
                  <span className="text-[10px] text-[#6d758c] font-mono uppercase tracking-widest">Eightco</span>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-sky-400">
                  {eightcoHoldings != null ? fmtCompact(eightcoHoldings) : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] mt-0.5">Eightco Holdings 지분</div>
              </div>

              {/* Difference */}
              <div className={`rounded-lg p-3 border ${
                premiumDiscountPct != null
                  ? isPremium
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-[#091328] border-[#6d758c]/15"
              }`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${
                    premiumDiscountPct != null
                      ? isPremium ? "text-amber-400/60" : "text-emerald-400/60"
                      : "text-[#6d758c]"
                  }`}>
                    {isPremium ? "Premium" : "Discount"}
                  </span>
                </div>
                <div className={`text-base font-bold font-mono tabular-nums ${
                  premiumDiscountPct != null
                    ? isPremium ? "text-amber-400" : "text-emerald-400"
                    : "text-[#6d758c]"
                }`}>
                  {premiumDiscountPct != null && totalTreasury != null
                    ? fmtCompact(Math.abs(bmnrMarketCap - totalTreasury))
                    : "–"}
                </div>
                <div className={`text-[10px] mt-0.5 font-mono ${
                  premiumDiscountPct != null
                    ? isPremium ? "text-amber-400/50" : "text-emerald-400/50"
                    : "text-[#6d758c]"
                }`}>
                  {premiumDiscountPct != null
                    ? `${isPremium ? "+" : ""}${premiumDiscountPct.toFixed(2)}% 차이`
                    : "계산 불가"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ETH 매집 목표 달성률 */}
        <div className="relative bg-[#071224] border border-cyan-500/20 rounded-xl p-6 mb-6 overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,210,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,255,0.04) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute top-0 left-0 w-24 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent" />
          <div className="absolute top-0 left-0 w-0.5 h-12 bg-gradient-to-b from-cyan-500 to-transparent" />

          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold tracking-widest bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    MISSION
                  </span>
                  <h2 className="text-sm font-semibold text-[#dee5ff]/80">ETH 전략 매집 목표</h2>
                </div>
                <p className="text-xs text-[#6d758c]">
                  이더리움 총 공급량({ETH_TOTAL_SUPPLY.toLocaleString()} ETH)의 5% 매집 전략 달성 현황
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-bold font-mono tabular-nums text-cyan-400 tracking-tight">
                  {ethAcqPct != null ? `${ethAcqPct.toFixed(3)}%` : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] mt-0.5 font-mono">of target achieved</div>
              </div>
            </div>

            <div className="mb-5">
              <div className="relative h-7 bg-[#091328] rounded border border-cyan-500/15 overflow-hidden">
                <div className="absolute inset-0 flex pointer-events-none">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-black/50 last:border-0" />
                  ))}
                </div>
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700"
                  style={{ width: `${barWidthPct}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-700 via-cyan-500 to-cyan-300" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-transparent" />
                  <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-r from-transparent to-cyan-300/60" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5 px-0.5">
                {["0%", "25%", "50%", "75%", "100%"].map((label) => (
                  <span key={label} className="text-[9px] text-[#6d758c]/40 font-mono">{label}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-cyan-500/10">
              <div>
                <div className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest mb-1">현재 보유량</div>
                <div className="text-lg font-bold font-mono tabular-nums text-cyan-400">
                  {ethTreasury != null ? ethTreasury.toLocaleString() : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] font-mono">ETH</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[#6d758c] font-mono uppercase tracking-widest mb-1">남은 목표</div>
                <div className="text-lg font-bold font-mono tabular-nums text-[#a3aac4]">
                  {ethRemaining != null ? ethRemaining.toLocaleString() : "–"}
                </div>
                <div className="text-[10px] text-[#6d758c] font-mono">ETH 필요</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#6d758c]/60 font-mono uppercase tracking-widest mb-1">최종 목표</div>
                <div className="text-lg font-bold font-mono tabular-nums text-[#6d758c]">
                  {ETH_TARGET.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#6d758c]/60 font-mono">ETH (총공급 5%)</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3개월 퍼포먼스 차트 */}
        <div className="bg-[#0d1526] border border-[#6d758c]/15 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-[#dee5ff]/80">BMNR vs ETH — 3개월 퍼포먼스 비교</h2>
              <p className="text-xs text-[#6d758c] mt-0.5">3개월 전 첫 거래일 = 100 기준 정규화</p>
            </div>
            <div className="flex items-center gap-4">
              {[
                { name: "BMNR", color: "#4ade80", perf: bmnrPerf },
                { name: "ETH",  color: "#60a5fa", perf: ethPerf  },
              ].map(({ name, color, perf }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-[#a3aac4]">{name}</span>
                  {perf !== null && (
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>
                      {parseFloat(perf) >= 0 ? "+" : ""}{perf}%
                    </span>
                  )}
                </div>
              ))}
              {chartData.length === 0 && <span className="text-xs text-rose-400/60">데이터 없음</span>}
            </div>
          </div>
          <PerformanceChart data={chartData} />
        </div>

        {/* ETH 스테이킹 현황 + 업데이트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── ETH 스테이킹 섹션 ── */}
          <div className="lg:col-span-2 relative bg-[#0d0f1e] border border-violet-500/20 rounded-xl p-6 overflow-hidden">
            {/* 코너 액센트 */}
            <div className="absolute top-0 left-0 w-32 h-0.5 bg-gradient-to-r from-violet-500 to-transparent" />
            <div className="absolute top-0 left-0 w-0.5 h-16 bg-gradient-to-b from-violet-500 to-transparent" />

            <div className="relative">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold tracking-widest bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">
                      STAKING
                    </span>
                    <h2 className="text-sm font-semibold text-[#dee5ff]/80">이더리움 스테이킹 현황</h2>
                  </div>
                  <p className="text-xs text-[#6d758c]">보유 ETH 스테이킹 운용 현황 및 실시간 예상 수익</p>
                </div>
                {stakedEth != null && (
                  <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full tracking-wider shrink-0">LIVE</span>
                )}
              </div>

              {/* 요약 카드 3개 */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* Total Staked */}
                <div className="bg-[#0d1526] border border-violet-500/20 rounded-xl p-4">
                  <div className="text-[9px] text-violet-400/50 font-mono uppercase tracking-widest mb-3">Total Staked</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-violet-300 leading-none">
                    {stakedEth != null ? stakedEth.toLocaleString() : "–"}
                  </div>
                  <div className="text-[10px] text-violet-400/40 font-mono mt-1 mb-2">ETH</div>
                  <div className="text-[10px] text-[#6d758c]">
                    보유량 대비{" "}
                    <span className="text-violet-300/80 font-bold">
                      {stakingPct != null ? `${stakingPct.toFixed(1)}%` : "–"}
                    </span>
                  </div>
                </div>

                {/* Current APY */}
                <div className="bg-[#0d1526] border border-emerald-500/20 rounded-xl p-4">
                  <div className="text-[9px] text-emerald-400/50 font-mono uppercase tracking-widest mb-3">Current APY</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 leading-none">
                    {stakingApy != null ? `${stakingApy}%` : "–"}
                  </div>
                  <div className="text-[10px] text-emerald-400/40 font-mono mt-1 mb-2">연간 수익률</div>
                  <div className="text-[10px] text-emerald-400/70 font-semibold">
                    vs 시장 평균 {STAKING_MARKET_AVG_APY}%
                    {stakingApy != null && (
                      <span className="ml-1 text-emerald-300">
                        {stakingApy > STAKING_MARKET_AVG_APY ? "+" : ""}
                        {(stakingApy - STAKING_MARKET_AVG_APY).toFixed(2)}%p
                      </span>
                    )}
                  </div>
                </div>

                {/* Annual Revenue */}
                <div className="bg-[#0d1526] border border-amber-500/20 rounded-xl p-4">
                  <div className="text-[9px] text-amber-400/50 font-mono uppercase tracking-widest mb-3">Annual Revenue</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 leading-none">
                    {annualRevenue != null ? fmtCompact(annualRevenue) : "–"}
                  </div>
                  <div className="text-[10px] text-amber-400/40 font-mono mt-1 mb-2">예상 연간 수익</div>
                  <div className="text-[10px] text-[#6d758c]">
                    @ ETH {ethData?.price != null ? fmt(ethData.price) : "–"}
                  </div>
                </div>
              </div>

              {/* 상세 현황 표 */}
              <div className="border border-[#6d758c]/15 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#6d758c]/15 bg-[#192540]/10">
                      <th className="text-left text-[9px] text-[#6d758c] font-mono uppercase tracking-widest px-4 py-2.5 font-normal">항목</th>
                      <th className="text-right text-[9px] text-[#6d758c] font-mono uppercase tracking-widest px-4 py-2.5 font-normal">상세 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "스테이킹 수량",    value: stakedEth != null ? `${stakedEth.toLocaleString()} ETH` : "–",                                                color: "violet"  },
                      { label: "총 보유량 대비",   value: stakingPct != null ? `${stakingPct.toFixed(1)}%` : "–",                                                        color: "violet"  },
                      { label: "현재 APY",         value: stakingApy != null ? `${stakingApy}%` : "–",                                                                    color: "emerald" },
                      { label: "시장 평균 APY",    value: `${STAKING_MARKET_AVG_APY}%`,                                                                                   color: "none"    },
                      { label: "APY 프리미엄",     value: stakingApy != null ? `${stakingApy > STAKING_MARKET_AVG_APY ? "+" : ""}${(stakingApy - STAKING_MARKET_AVG_APY).toFixed(2)}%p` : "–", color: "emerald" },
                      { label: "예상 연간 수익",   value: annualRevenue != null ? fmtCompact(annualRevenue) : "–",                                                         color: "amber"   },
                      { label: "예상 월간 수익",   value: annualRevenue != null ? fmtCompact(annualRevenue / 12) : "–",                                                    color: "amber"   },
                      { label: "예상 일간 수익",   value: annualRevenue != null ? fmtCompact(annualRevenue / 365) : "–",                                                   color: "amber"   },
                      { label: "스테이킹 형태",    value: "Liquid Staking",                                                                                                color: "none"    },
                      { label: "리워드 주기",      value: "자동 복리 (매 에포크)",                                                                                         color: "none"    },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-[#6d758c]/10 last:border-0 hover:bg-[#192540]/20 transition-colors">
                        <td className="px-4 py-2.5 text-[11px] text-[#6d758c] font-mono">{row.label}</td>
                        <td className={`px-4 py-2.5 text-[11px] text-right font-mono font-semibold tabular-nums ${
                          row.color === "violet"  ? "text-violet-300" :
                          row.color === "emerald" ? "text-emerald-400" :
                          row.color === "amber"   ? "text-amber-400" :
                          "text-[#a3aac4]"
                        }`}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 최근 주요 업데이트 (Bitmine IR + SEC 공시) */}
          <div className="bg-[#0d1526] border border-[#6d758c]/15 rounded-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#dee5ff]/80">최근 주요 업데이트</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full tracking-wider">IR</span>
                <span className="text-[9px] text-[#6d758c]/60">
                  뉴스 {newsItems.length} · SEC {secItems.length}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto flex-1" style={{ maxHeight: "520px" }}>
              {combinedUpdates.map((u, i) => (
                <div key={i} className="pb-3 border-b border-[#6d758c]/15 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.tagColor}`}>{u.tag}</span>
                    <span className="text-[10px] text-[#6d758c] font-mono">{u.date}</span>
                  </div>
                  {u.url ? (
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="group block">
                      <div className="text-xs font-medium text-[#dee5ff]/80 leading-snug mb-1 group-hover:text-[#dee5ff] transition-colors line-clamp-2">
                        {u.title}
                        <span className="inline-block ml-1 text-[#6d758c]/60 group-hover:text-[#a3aac4] text-[9px]">↗</span>
                      </div>
                    </a>
                  ) : (
                    <div className="text-xs font-medium text-[#dee5ff]/80 leading-snug mb-1">{u.title}</div>
                  )}
                  <div className="text-[11px] text-[#6d758c] leading-relaxed">{u.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 데이터 출처 */}
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { color: "bg-emerald-500/60", label: `BMNR 주가: Yahoo Finance (폴백 $${BMNR_PRICE_FALLBACK})` },
            { color: "bg-blue-500/60",    label: "ETH·BTC 가격·과거 데이터: CoinGecko API" },
            { color: "bg-violet-500/60",  label: `ETH 보유량·스테이킹·BTC·현금: Supabase DB · 발행량 폴백: ${SHARES_OUTSTANDING_FALLBACK.toLocaleString()}주` },
            { color: "bg-cyan-500/60",    label: `ETH 목표: ${ETH_TARGET.toLocaleString()} ETH (총공급 5%)` },
            { color: "bg-sky-500/60",     label: "뉴스: bitminetech.io IR · 공시: SEC EDGAR" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-[#6d758c]">
              <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
              {label}
            </div>
          ))}
        </div>

        {/* 방문자 댓글 */}
        <CommentsSection initialComments={initialComments} />

        {/* ── Footer ── */}
        <footer className="mt-16 pt-8 border-t border-[#6d758c]/15">
          <div className="pb-10 flex flex-col items-center gap-3 text-sm text-[#a3aac4]">
            <p>© 2026 BMNR Unofficial Dashboard. All rights reserved.</p>
            <div className="flex items-center gap-3 text-xs">
              <a href="/glossary" className="hover:text-[#dee5ff] transition-colors">BMNR 용어 사전</a>
              <span className="text-[#6d758c]">|</span>
              <a href="/privacy" className="hover:text-[#dee5ff] transition-colors">개인정보처리방침</a>
              <span className="text-[#6d758c]">|</span>
              <a href="/terms" className="hover:text-[#dee5ff] transition-colors">이용약관 및 면책조항</a>
            </div>
          </div>
        </footer>

        </div> {/* max-w-7xl */}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#060e20]/90 backdrop-blur-xl border-t border-[#6d758c]/15 h-16 flex items-center justify-around z-50 pb-safe">
        {[
          { label: "Dashboard", icon: "dashboard", href: "/" },
          { label: "Treasury", icon: "account_balance_wallet", href: "#treasury" },
          { label: "Insights", icon: "auto_stories", href: "/insights" },
          { label: "Glossary", icon: "menu_book", href: "/glossary" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 text-[#a3aac4] hover:text-[#69f6b8] transition-colors">
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
