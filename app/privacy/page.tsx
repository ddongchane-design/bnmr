import Link from 'next/link';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-8 md:p-16 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-white mb-6">개인정보처리방침 (Privacy Policy)</h1>
                <p className="text-gray-400 text-sm">최종 수정일: 2026년 3월 16일</p>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">1. 수집하는 개인정보</h2>
                    <p className="text-gray-400 leading-relaxed">
                        본 웹사이트(BMNR Dashboard)는 회원가입을 요구하지 않으며, 방문자의 민감한 개인정보를 직접적으로 수집하지 않습니다. 다만, 서비스 개선 및 웹사이트 트래픽 분석, 광고 송출(Google AdSense 등)을 위해 쿠키(Cookie)와 같은 자동화된 데이터 수집 도구를 사용할 수 있습니다.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">2. 쿠키(Cookies) 및 광고</h2>
                    <p className="text-gray-400 leading-relaxed">
                        본 사이트는 구글(Google)을 포함한 타사 공급업체의 광고를 게재할 수 있습니다. 구글 및 파트너사는 쿠키를 사용하여 사용자가 본 사이트 또는 다른 웹사이트를 방문한 기록을 기반으로 맞춤형 광고를 제공할 수 있습니다. 사용자는 언제든지 웹 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">3. 문의하기</h2>
                    <p className="text-gray-400 leading-relaxed">
                        개인정보 처리와 관련된 문의 사항이 있으신 경우, 운영자 이메일로 연락해 주시기 바랍니다.
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