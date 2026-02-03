'use client';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">이용약관 및 데이터 정책</h1>
      
      <div className="space-y-8 text-gray-700">
        {/* 서비스 목적 */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">서비스 목적</h2>
          <p className="text-blue-800">
            본 서비스는 공개 데이터(arXiv, SEC EDGAR, USPTO, GitHub 메타데이터)를 
            <strong> 연구·교육·트렌드 분석 목적</strong>으로만 제공합니다.
          </p>
          <p className="text-blue-800 mt-2">
            모든 데이터는 원 출처의 라이선스와 약관을 존중하며, 
            원문은 각 사이트에서 확인하시기 바랍니다.
          </p>
        </section>

        {/* 데이터 소스 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제1조 (데이터 소스 및 수집 범위)</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold">arXiv (논문)</h3>
              <ul className="text-sm text-gray-600 mt-1 list-disc pl-4">
                <li>수집: 제목, 저자, 초록(500자 이내)</li>
                <li>미수집: PDF 전문 (원문 링크로 대체)</li>
                <li>메타데이터: CC0 1.0 Public Domain</li>
                <li className="text-amber-700">논문 전체/초록: 각 논문의 개별 라이선스(CC BY, CC BY-NC 등) 적용</li>
                <li>본 서비스는 연구·교육·트렌드 분석 목적의 보조 요약만 제공</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold">SEC EDGAR (기업 공시)</h3>
              <ul className="text-sm text-gray-600 mt-1 list-disc pl-4">
                <li>수집: 공시 메타데이터 (기업명, 공시유형, 날짜)</li>
                <li>법적 상태: 미국 연방정부 저작물 (Public Domain)</li>
                <li>자유롭게 분석·요약 가능</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold">USPTO (특허)</h3>
              <ul className="text-sm text-gray-600 mt-1 list-disc pl-4">
                <li>수집: 특허번호, 제목, 초록</li>
                <li>법적 상태: 공개 특허 데이터 (공공 정보)</li>
                <li>자유롭게 분석·요약 가능</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-gray-500 pl-4">
              <h3 className="font-semibold">GitHub (오픈소스)</h3>
              <ul className="text-sm text-gray-600 mt-1 list-disc pl-4">
                <li>수집: 리포지터리 이름, 설명, 스타 수, 언어</li>
                <li>미수집: 소스코드 본문</li>
                <li>공식 API 사용, Rate Limit 준수</li>
                <li className="text-amber-700">GitHub Acceptable Use Policy 및 API 이용약관 준수</li>
                <li>리포지터리의 콘텐츠 라이선스를 변경·재부여하지 않음</li>
              </ul>
            </div>
          </div>
        </section>

        {/* AI 요약 정책 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제2조 (AI 요약 정책)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>AI 요약은 &quot;짧은 설명 + 출처·원문 링크&quot; 수준으로 제공됩니다.</li>
            <li>원문을 완전히 대체하는 리포팅 서비스가 아닙니다.</li>
            <li>상세 내용은 반드시 원문 링크를 통해 확인하시기 바랍니다.</li>
          </ul>
        </section>

        {/* 접근 제한 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제3조 (접근 제한)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>본 서비스는 <strong>로그인/권한이 있는 일부 인원만</strong> 접근 가능합니다.</li>
            <li>상업적 수익 모델(유료 구독, 광고, 재판매)이 없는 내부용 서비스입니다.</li>
            <li>연구·교육·트렌드 분석 목적으로만 사용됩니다.</li>
          </ul>
        </section>

        {/* 원칙 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제4조 (아키텍처 원칙)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>원문 전문(PDF, 코드 파일 등)을 미러링하지 않습니다.</li>
            <li>항상 원 사이트로 링크를 제공합니다.</li>
            <li>각 데이터 소스의 API 사용 정책 및 Rate Limit을 준수합니다.</li>
            <li>User-Agent에 봇 식별 정보를 명시합니다 (<code>RCIPBot/1.0</code>).</li>
          </ul>
        </section>

        {/* robots.txt 준수 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제5조 (robots.txt 준수)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>모든 데이터 수집 시 해당 사이트의 <code>robots.txt</code> 규칙을 확인합니다.</li>
            <li><code>Disallow</code> 경로는 수집하지 않습니다.</li>
            <li><code>Crawl-delay</code> 지시를 준수합니다.</li>
            <li>robots.txt 파서가 구현되어 있으며, 24시간 캐시됩니다.</li>
          </ul>
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm font-mono">
            User-Agent: RCIPBot/1.0<br/>
            Rate Limits: arXiv(3초), GitHub(2초), SEC(0.2초), USPTO(1초)
          </div>
        </section>

        {/* 면책 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제5조 (면책조항)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>본 서비스는 링크된 외부 사이트의 콘텐츠에 대해 책임지지 않습니다.</li>
            <li>제공된 정보의 정확성, 완전성, 적시성에 대해 보증하지 않습니다.</li>
            <li>AI 요약은 참고용이며, 정확한 정보는 원문을 확인하시기 바랍니다.</li>
          </ul>
        </section>

        {/* 데이터 출처 표시 */}
        <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제6조 (데이터 출처)</h2>
          <p className="mb-4">본 서비스의 데이터는 다음 공식 API를 통해 수집됩니다:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-white rounded border">
              <p className="font-semibold text-red-700">arXiv API</p>
              <p className="text-gray-600">https://arxiv.org/help/api</p>
              <p className="text-xs text-gray-500 mt-1">메타데이터: CC0 1.0 Public Domain</p>
              <p className="text-xs text-amber-600">논문 본문: 각 논문의 개별 라이선스 적용</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="font-semibold text-gray-700">GitHub REST API</p>
              <p className="text-gray-600">https://docs.github.com/en/rest</p>
              <p className="text-xs text-gray-500 mt-1">Acceptable Use Policy 및 API ToS 준수</p>
              <p className="text-xs text-amber-600">리포지터리 라이선스 변경·재부여 안 함</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="font-semibold text-blue-700">SEC EDGAR API</p>
              <p className="text-gray-600">https://www.sec.gov/developer</p>
              <p className="text-xs text-gray-500 mt-1">Public Domain (미국 연방정부 저작물)</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="font-semibold text-amber-700">USPTO PatentsView API</p>
              <p className="text-gray-600">https://patentsview.org/apis</p>
              <p className="text-xs text-gray-500 mt-1">Public Domain (공개 특허 데이터)</p>
            </div>
          </div>
        </section>

        {/* 저작권 신고 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제7조 (저작권 문의)</h2>
          <p>
            저작권 관련 문의 또는 삭제 요청은{' '}
            <a href="/copyright" className="text-blue-600 hover:underline">저작권 신고 페이지</a>를 
            통해 접수해 주세요. 24시간 이내에 검토 및 조치합니다.
          </p>
        </section>

        <section className="pt-4 border-t">
          <p className="text-sm text-gray-500">시행일: 2024년 1월 1일</p>
          <p className="text-sm text-gray-500 mt-1">최종 수정일: 2026년 2월 3일</p>
        </section>
      </div>
    </div>
  );
}
