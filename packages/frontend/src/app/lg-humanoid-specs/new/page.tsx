'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

function NewModelStub() {
  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <Link
          href="/lg-humanoid-specs"
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#D3D1C7] text-[#2C2C2A] hover:border-[#A50034] hover:text-[#A50034] text-[12px] font-medium transition-colors mb-6"
          style={{ borderRadius: 4 }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          목록으로
        </Link>
        <h1 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight mb-3">
          신규 모델 추가
        </h1>
        <div className="border border-[#FAEAE7] bg-[#FAEAE7]/40 p-6" style={{ borderRadius: 8 }}>
          <p className="text-[14px] text-[#A50034] font-medium">8탭 입력 폼은 다음 세션에서 구현 예정</p>
          <p className="text-[12.5px] text-[#5F5E5A] mt-2 leading-relaxed">
            기본 / 물리 / 이동 / 조작 / 인지 / AI / 안전 / 가격 8개 탭 + EE 옵션 9 토글.
            현재는 backend API (<code className="font-mono text-[11.5px] bg-white px-1">POST /api/humanoid-specs</code>) 직접 호출로 등록 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NewModelPage() {
  return (
    <AuthGuard>
      <NewModelStub />
    </AuthGuard>
  );
}
