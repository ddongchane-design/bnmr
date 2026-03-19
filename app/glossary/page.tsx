import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "BMNR & 크립토 용어 사전 | BMNR Dashboard",
  description:
    "NAV, 이더리움 스테이킹, 프리미엄/디스카운트, Total Treasury 등 BMNR 대시보드를 이해하기 위한 핵심 금융·암호화폐 용어를 쉽게 풀어드립니다.",
};

const terms = [
  {
    id: "nav",
    icon: "💼",
    en: "NAV (Net Asset Value)",
    ko: "순자산가치",
    badge: "기초 개념",
    badgeColor: "bg-blue-500/15 text-blue-400",
    content: [
      {
        heading: "한 줄 정의",
        text: "NAV(Net Asset Value), 즉 순자산가치란 기업이 보유한 모든 자산에서 부채를 뺀 '진짜 지갑 두께'입니다.",
      },
      {
        heading: "쉬운 비유로 이해하기",
        text: `여러분이 친구에게 "내 재산이 얼마야?"라고 물었을 때, 그 친구가 "집 값 3억, 차 3천만 원, 통장에 500만 원 있어"라고 말했다면 — 이게 바로 '총자산'입니다. 그런데 여기서 빌린 대출금 1억 원을 빼면 진짜 순자산, 즉 NAV는 2억 3,500만 원이 되는 거죠.

기업도 마찬가지입니다. BMNR 같은 회사가 "우리 회사 금고에 이더리움 몇 천 개, 현금 몇 달러가 있어요"라고 공시하면, 그 자산들의 현재 시장가격을 모두 더한 뒤 빚을 빼면 NAV가 나옵니다.`,
      },
      {
        heading: "NAV per Share (주당 순자산가치)란?",
        text: `NAV를 계산했으면, 이걸 발행된 주식 수로 나눈 값이 'NAV per Share(주당 순자산가치)'입니다. 예를 들어 회사 전체 NAV가 1억 달러이고, 총 주식이 1,000만 주라면 — 주당 NAV는 10달러가 됩니다.

이 숫자가 중요한 이유는, 내가 지금 이 주식을 10달러에 살 수 있다면 정확히 자산 가치만큼 내고 사는 것이고, 5달러에 살 수 있다면 실제 자산 가치의 절반 가격에 사는 '대박 세일' 상황이기 때문입니다. BMNR 대시보드에서 실시간으로 확인할 수 있는 바로 그 수치입니다.`,
      },
      {
        heading: "BMNR에서의 계산 방법",
        text: `BMNR의 경우, 핵심 자산이 이더리움(ETH)이기 때문에 NAV 계산도 ETH를 중심으로 이루어집니다.

계산식: NAV per Share = (ETH 현재 가격 × ETH 보유량) ÷ 총 발행 주식 수

즉, ETH 가격이 오르면 BMNR의 NAV도 자동으로 올라가고, ETH 가격이 떨어지면 NAV도 함께 내려갑니다. BMNR 주식은 사실상 이더리움 가격을 추적하는 '주식 형태의 ETH 투자 상품'과 유사한 성격을 갖게 되는 겁니다.`,
      },
    ],
  },
  {
    id: "staking",
    icon: "🏦",
    en: "Ethereum Staking",
    ko: "이더리움 스테이킹",
    badge: "수익 구조",
    badgeColor: "bg-emerald-500/15 text-emerald-400",
    content: [
      {
        heading: "한 줄 정의",
        text: "스테이킹(Staking)이란 보유한 암호화폐를 블록체인 네트워크에 예치(lock-up)하고, 그 대가로 이자 수익을 받는 행위입니다.",
      },
      {
        heading: "은행 예금과 뭐가 다를까?",
        text: `은행에 돈을 맡기면 은행이 그 돈을 다른 곳에 빌려주고 그 이자 중 일부를 여러분에게 돌려주죠. 이더리움 스테이킹도 원리는 비슷합니다. 여러분이 이더리움을 이더리움 네트워크에 '예치'하면, 네트워크는 그 이더리움을 거래 검증(Validation)에 활용하고, 그 보상으로 추가 이더리움을 지급합니다.

차이점이 있다면, 은행은 내 돈을 가져가서 마음대로 운용하지만, 스테이킹은 내가 직접 네트워크 보안에 참여하는 방식이라는 점입니다. 즉, 중간 기관(은행) 없이 나의 자산으로 내가 직접 수익을 버는 구조입니다.`,
      },
      {
        heading: "복리(Compound Interest) 효과",
        text: `스테이킹의 진짜 매력은 '복리'에 있습니다. 예를 들어 100 ETH를 스테이킹해서 연 4%의 이자를 받는다고 가정해봅시다. 1년 후에는 104 ETH가 되고, 그 104 ETH를 다시 스테이킹하면 다음 해에는 104 × 1.04 = 108.16 ETH가 됩니다.

처음에는 별 차이가 없어 보이지만, 10년이 지나면 단리와 복리의 차이가 어마어마해집니다. 이것이 바로 '복리의 마법'이고, BMNR이 스테이킹을 핵심 전략으로 삼는 이유입니다. ETH 보유량 자체가 시간이 지날수록 자동으로 늘어나기 때문입니다.`,
      },
      {
        heading: "BMNR의 스테이킹 전략",
        text: `BMNR은 단순히 ETH를 사서 금고에 넣어두는 것이 아니라, 보유한 ETH의 상당 부분을 스테이킹에 활용합니다. 이를 통해 ETH 가격 상승 수익 + 스테이킹 이자 수익이라는 두 가지 수익원을 동시에 추구합니다.

BMNR 대시보드에서 'Staked ETH' 항목을 보시면 현재 스테이킹 중인 ETH 물량을 확인할 수 있습니다. 이 ETH들은 네트워크에서 열심히 '일'을 하며 추가 ETH를 벌어들이고 있는 중입니다.`,
      },
    ],
  },
  {
    id: "premium-discount",
    icon: "📊",
    en: "Premium & Discount",
    ko: "프리미엄 & 디스카운트",
    badge: "가치 평가",
    badgeColor: "bg-amber-500/15 text-amber-400",
    content: [
      {
        heading: "한 줄 정의",
        text: "프리미엄(Premium)은 주식 가격이 NAV(순자산가치)보다 높게 거래될 때, 디스카운트(Discount)는 NAV보다 낮게 거래될 때를 말합니다.",
      },
      {
        heading: "쉬운 비유: 금 한 돈짜리 팔찌",
        text: `금 한 돈의 시세가 40만 원이라고 가정합시다. 이 금으로 만든 팔찌를 누군가 50만 원에 판다면 — 여러분은 10만 원의 '프리미엄(웃돈)'을 지불하는 겁니다. 팔찌가 예쁘거나 브랜드가 유명하면 사람들은 기꺼이 프리미엄을 지불합니다.

반대로, 그 팔찌가 30만 원에 팔린다면? 실제 금 가치보다 싸게 파는 '디스카운트(할인)' 상태입니다. 이럴 때 금에 투자하고 싶은 사람 입장에서는 오히려 이득인 거죠.`,
      },
      {
        heading: "주식 시장에서 왜 프리미엄/디스카운트가 생길까?",
        text: `주식 가격은 '미래 기대치'를 반영합니다. 사람들이 이 회사가 앞으로 더 잘 될 것이라고 기대하면 주가가 NAV를 초과한 '프리미엄' 상태가 됩니다. 반대로 회사에 대한 신뢰가 낮거나 인지도가 부족하면 NAV보다 낮은 '디스카운트' 상태에 방치되기도 합니다.

비트코인 보유 회사인 MicroStrategy(MSTR)의 경우, 비트코인에 대한 강력한 미래 기대감 때문에 NAV 대비 수백 퍼센트의 프리미엄에 거래되기도 했습니다. 반면 일부 소규모 코인 보유 회사들은 NAV보다 훨씬 싼 가격에 거래되는 경우도 있습니다.`,
      },
      {
        heading: "BMNR의 현재 상황은?",
        text: `BMNR 대시보드의 'NAV per Share' 카드에서 '% vs NAV' 수치를 확인하시면 됩니다. 이 수치가 마이너스(-) 상태라면 현재 BMNR 주가가 실제 ETH 자산 가치보다 저렴하게 거래되고 있다는 의미, 즉 '디스카운트' 상태입니다.

이를 어떻게 해석할지는 완전히 투자자 개인의 판단에 달려 있습니다. 어떤 사람은 "자산 대비 싸게 살 기회"라고 볼 수 있고, 또 다른 사람은 "시장이 이 회사를 저평가하는 이유가 있을 것"이라고 볼 수도 있습니다. 중요한 것은, 이 숫자가 의미하는 바를 정확히 이해하고 스스로 판단하는 것입니다.`,
      },
    ],
  },
  {
    id: "total-treasury",
    icon: "🏛️",
    en: "Total Treasury",
    ko: "총 자산 (트레저리)",
    badge: "자산 구조",
    badgeColor: "bg-violet-500/15 text-violet-400",
    content: [
      {
        heading: "한 줄 정의",
        text: "Total Treasury(총 트레저리)란 기업이 보유한 모든 자산 — 암호화폐, 현금, 지분 등 — 의 합산 가치입니다.",
      },
      {
        heading: "트레저리(Treasury)가 뭔가요?",
        text: `'트레저리'는 원래 '국고(國庫)' 또는 '금고'라는 뜻입니다. 기업에서 트레저리라고 하면 회사가 사업 운영을 위해 보유하고 있는 현금과 유동 자산들의 총합을 의미합니다. 마치 왕이 전쟁을 대비해 금고에 금화를 쌓아두는 것처럼, 기업도 미래의 투자, 인수합병, 운영 자금 등을 위해 자산을 쌓아둡니다.

최근 MicroStrategy, Tesla, 그리고 BMNR 같은 회사들은 전통적인 현금 대신 비트코인이나 이더리움 같은 암호화폐를 트레저리로 보유하는 '디지털 자산 트레저리 전략'을 채택하고 있습니다.`,
      },
      {
        heading: "BMNR 트레저리의 구성",
        text: `BMNR의 총 트레저리는 크게 네 가지로 구성됩니다.

① ETH (이더리움): 핵심 자산. 직접 보유 + 스테이킹 중인 ETH의 합산 가치
② BTC (비트코인): 추가로 보유 중인 비트코인
③ Cash (현금): 운영 자금 및 유동성 확보용 달러 현금
④ 지분 (Beast Industries 등): 자회사 또는 투자처에 대한 지분 가치

이 네 가지를 모두 현재 시장 가격으로 환산하여 합산한 것이 'Total Treasury(총 트레저리)'입니다. BMNR 대시보드 중간에 있는 트레저리 구성 바(Bar Chart)에서 각 자산이 전체 트레저리에서 차지하는 비율을 한눈에 볼 수 있습니다.`,
      },
      {
        heading: "트레저리와 시가총액의 관계",
        text: `주식 시장에서 BMNR의 '시가총액(Market Cap)'은 현재 주가 × 총 발행 주식 수로 계산됩니다. 이 시가총액을 트레저리 가치와 비교하면 이 회사의 주식이 비싼지 싼지를 판단하는 데 큰 힌트가 됩니다.

바로 이 비율이 BMNR 대시보드의 핵심 지표인 'mNAV 비율'입니다. mNAV = 시가총액 ÷ (ETH 보유량 × ETH 가격). mNAV가 1.0이면 시가총액이 ETH 자산 가치와 동일한 상태이고, 1.0 미만이면 ETH 가치보다 싸게 거래되고 있다는 뜻입니다.`,
      },
    ],
  },
];

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans">
      {/* 헤더 */}
      <div className="border-b border-gray-800 bg-[#0d0d14]/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              BMNR & 크립토 용어 사전
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              초보자도 이해할 수 있는 금융·암호화폐 핵심 개념 가이드
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-1.5"
          >
            ← 대시보드
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* 인트로 */}
        <div className="mb-10 p-5 rounded-xl bg-[#111] border border-gray-800">
          <p className="text-sm text-gray-400 leading-relaxed">
            BMNR 대시보드의 숫자들이 낯설게 느껴지셨나요? 걱정 마세요. 이
            페이지에서는 <strong className="text-gray-200">NAV, 스테이킹, 프리미엄/디스카운트, 트레저리</strong> 등
            핵심 개념들을 마치 친한 친구에게 설명하듯 쉽고 자세하게 풀어드립니다.
            금융이나 암호화폐를 전혀 모르시는 분도 끝까지 읽으시면 대시보드의
            모든 지표를 스스로 해석할 수 있게 됩니다.
          </p>
        </div>

        {/* 목차 */}
        <div className="mb-10">
          <h2 className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-3">
            목차
          </h2>
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="text-xs text-gray-400 hover:text-white transition-colors bg-[#111] border border-gray-800 hover:border-gray-600 rounded-full px-3 py-1.5"
              >
                {t.icon} {t.ko}
              </a>
            ))}
          </div>
        </div>

        {/* 용어 카드 */}
        <div className="space-y-8">
          {terms.map((term) => (
            <article
              key={term.id}
              id={term.id}
              className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden scroll-mt-20"
            >
              {/* 카드 헤더 */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-800/60">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{term.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-white">
                          {term.ko}
                        </h2>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${term.badgeColor}`}
                        >
                          {term.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        {term.en}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 카드 내용 */}
              <div className="px-6 py-5 space-y-6">
                {term.content.map((section, i) => (
                  <div key={i}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono mb-2">
                      {section.heading}
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                      {section.text}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* 하단 CTA */}
        <div className="mt-12 p-5 rounded-xl bg-[#111] border border-gray-800 text-center">
          <p className="text-sm text-gray-400 mb-4">
            이제 용어를 이해했다면, 실시간 대시보드에서 직접 확인해보세요!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700 rounded-lg px-5 py-2.5 font-medium"
          >
            ← 대시보드 홈으로 돌아가기
          </Link>
        </div>

        {/* 푸터 */}
        <p className="mt-10 text-center text-xs text-gray-600">
          본 페이지는 교육 및 정보 제공 목적으로 작성되었으며, 투자 권유가
          아닙니다.
        </p>
      </main>
    </div>
  );
}
