'use client';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">이용약관</h1>
      
      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제1조 (목적)</h2>
          <p>
            본 약관은 로봇 경쟁 정보 포털(이하 &quot;서비스&quot;)의 이용조건 및 절차, 
            이용자와 서비스 제공자의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제2조 (서비스의 내용)</h2>
          <p className="mb-4">본 서비스는 다음과 같은 정보를 제공합니다:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>로봇 산업 관련 뉴스 기사의 <strong>제목, 출처, 링크, 발행일</strong> 정보</li>
            <li>로봇 제조사 및 제품 정보</li>
            <li>산업 동향 및 키워드 분석</li>
          </ul>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 font-medium">
              ⚠️ 본 서비스는 뉴스 기사의 원문 또는 요약본을 제공하지 않습니다.
            </p>
            <p className="text-blue-700 mt-2">
              기사 내용을 확인하시려면 제공된 링크를 통해 원본 출처를 방문해 주세요.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제3조 (저작권 및 지적재산권)</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>
              본 서비스에서 제공하는 기사 링크의 원본 콘텐츠에 대한 저작권은 
              해당 언론사 및 원저작자에게 있습니다.
            </li>
            <li>
              본 서비스는 기사의 제목, 출처, URL, 발행일 등 최소한의 메타데이터만을 
              수집하며, 기사 본문을 저장하거나 재배포하지 않습니다.
            </li>
            <li>
              본 서비스는 각 출처 사이트의 robots.txt 및 이용약관을 준수합니다.
            </li>
            <li>
              저작권 관련 문의 또는 삭제 요청은 <a href="/copyright" className="text-blue-600 hover:underline">저작권 신고 페이지</a>를 
              통해 접수해 주세요.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제4조 (면책조항)</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>
              본 서비스는 링크된 외부 사이트의 콘텐츠에 대해 책임지지 않습니다.
            </li>
            <li>
              제공된 정보의 정확성, 완전성, 적시성에 대해 보증하지 않습니다.
            </li>
            <li>
              서비스 이용으로 인해 발생하는 직접적, 간접적 손해에 대해 책임지지 않습니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제5조 (데이터 수집 정책)</h2>
          <p className="mb-4">본 서비스는 법적 안전성을 위해 다음 원칙을 준수합니다:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>화이트리스트에 등록된 공식 언론사 및 기업 사이트만 크롤링</li>
            <li>각 사이트의 robots.txt 규칙 준수</li>
            <li>기사 본문 저장 및 AI 분석 미실시</li>
            <li>적절한 크롤링 간격 유지 (Rate Limiting)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">제6조 (약관의 변경)</h2>
          <p>
            본 약관은 관련 법령의 변경이나 서비스 정책 변경에 따라 수정될 수 있으며, 
            변경 시 서비스 내 공지를 통해 안내합니다.
          </p>
        </section>

        <section className="pt-4 border-t">
          <p className="text-sm text-gray-500">
            시행일: 2024년 1월 1일
          </p>
          <p className="text-sm text-gray-500 mt-1">
            최종 수정일: 2024년 1월 1일
          </p>
        </section>
      </div>
    </div>
  );
}
