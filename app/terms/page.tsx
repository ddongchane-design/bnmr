import Link from 'next/link';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-8 md:p-16 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-white mb-6">이용약관 및 면책조항 (Terms of Service)</h1>
                <p className="text-gray-400 text-sm">최종 수정일: 2026년 3월 16일</p>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">1. 목적 및 정보의 성격</h2>
                    <p className="text-gray-400 leading-relaxed">
                        본 웹사이트는 Bitmine Immersion Technologies(BMNR)와 관련된 공개 데이터, 가상자산 시세 및 기타 재무 정보를 시각화하여 제공하는 개인 대시보드입니다. 사이트에서 제공되는 모든 데이터와 콘텐츠는 오직 **정보 제공 및 학습 목적**으로만 작성되었습니다.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">2. 투자 면책조항 (중요)</h2>
                    <p className="text-gray-400 leading-relaxed font-medium text-red-400/80">
                        본 사이트에서 제공하는 시세, 프리미엄/디스카운트 계산, 자산 가치 등의 정보는 외부 API 및 자체 계산식에 의존하며, 그 정확성이나 완전성을 100% 보장하지 않습니다. 어떠한 경우에도 본 사이트의 정보가 주식(BMNR)이나 암호화폐(ETH, BTC 등)에 대한 매수/매도 추천(Financial Advice)으로 해석될 수 없습니다. 모든 투자의 최종 결정과 책임은 전적으로 투자자 본인에게 있습니다.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">3. 저작권 및 외부 링크</h2>
                    <p className="text-gray-400 leading-relaxed">
                        본 사이트에 포함된 타사 로고, 기업명, 실시간 데이터의 저작권은 해당 원저작자에게 있습니다. 또한, 사이트 내 포함된 외부 링크로 접속하여 발생하는 문제에 대해 본 사이트 운영자는 책임지지 않습니다.
                    </p>
                </section>

                <div className="pt-8 border-t border-gray-800">
                    <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
                        ← 대시보드 홈으로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}