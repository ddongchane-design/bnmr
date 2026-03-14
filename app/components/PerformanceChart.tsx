"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type ChartPoint = {
  date: string;
  bmnr: number | null;       // 정규화 값 (기준 100)
  eth: number | null;        // 정규화 값 (기준 100)
  bmnrPrice: number | null;  // 실제 주가 ($)
  ethPrice: number | null;   // 실제 ETH 가격 ($)
};

function fmtUsd(v: number, decimals = 2): string {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  // payload에서 BMNR / ETH 엔트리 추출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bmnrEntry = payload.find((p: any) => p.dataKey === "bmnr");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ethEntry  = payload.find((p: any) => p.dataKey === "eth");

  const bmnrPerf   = bmnrEntry?.value ?? null;   // e.g. 124.5 → +24.5%
  const ethPerf    = ethEntry?.value  ?? null;
  const bmnrPrice  = bmnrEntry?.payload?.bmnrPrice ?? null;
  const ethPrice   = ethEntry?.payload?.ethPrice   ?? null;

  // 스프레드: BMNR 성과 - ETH 성과 (퍼센트포인트)
  const spread = bmnrPerf != null && ethPerf != null ? bmnrPerf - ethPerf : null;
  const spreadPositive = spread != null && spread >= 0;

  return (
    <div className="bg-[#12121c] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[210px]">
      {/* 날짜 헤더 */}
      <div className="px-3 py-2 border-b border-white/5">
        <p className="text-white/40 text-[10px] font-mono">{label}</p>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* BMNR 행 */}
        {bmnrPerf != null && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
              <span className="text-xs text-white/50">BMNR</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              {bmnrPrice != null && (
                <span className="text-[11px] text-white/35 tabular-nums">
                  {fmtUsd(bmnrPrice)}
                </span>
              )}
              <span className="text-xs font-bold text-[#4ade80] tabular-nums w-16 text-right">
                {bmnrPerf >= 100 ? "+" : ""}{(bmnrPerf - 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* ETH 행 */}
        {ethPerf != null && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
              <span className="text-xs text-white/50">ETH</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              {ethPrice != null && (
                <span className="text-[11px] text-white/35 tabular-nums">
                  {fmtUsd(ethPrice, 0)}
                </span>
              )}
              <span className="text-xs font-bold text-[#60a5fa] tabular-nums w-16 text-right">
                {ethPerf >= 100 ? "+" : ""}{(ethPerf - 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* 스프레드 구분선 + 행 */}
        {spread != null && (
          <>
            <div className="border-t border-white/5 pt-2 flex items-center justify-between gap-3">
              <span className="text-[10px] text-white/30">BMNR vs ETH 차이</span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: spreadPositive ? "#4ade80" : "#f87171" }}
              >
                {spreadPositive ? "▲" : "▼"} {Math.abs(spread).toFixed(2)}%p
              </span>
            </div>
            <div className="text-[10px] text-white/25 text-right -mt-1">
              {spreadPositive
                ? "BMNR이 ETH보다 앞섬"
                : "ETH이 BMNR보다 앞섬"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PerformanceChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-white/25 text-sm">
        차트 데이터를 불러오지 못했습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            `${v >= 100 ? "+" : ""}${(v - 100).toFixed(0)}%`
          }
          domain={["auto", "auto"]}
          width={52}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="bmnr"
          name="BMNR"
          stroke="#4ade80"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "#4ade80" }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="eth"
          name="ETH"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "#60a5fa" }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
