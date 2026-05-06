'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

function EditStub() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <Link
          href={`/lg-humanoid-specs/${id}`}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#D3D1C7] text-[#2C2C2A] hover:border-[#A50034] hover:text-[#A50034] text-[12px] font-medium transition-colors mb-6"
          style={{ borderRadius: 4 }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          상세로
        </Link>
        <h1 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight mb-3">
          모델 편집 (ID: {id})
        </h1>
        <div className="border border-[#FAEAE7] bg-[#FAEAE7]/40 p-6" style={{ borderRadius: 8 }}>
          <p className="text-[14px] text-[#A50034] font-medium">8탭 편집 폼은 다음 세션에서 구현 예정</p>
          <p className="text-[12.5px] text-[#5F5E5A] mt-2 leading-relaxed">
            현재는 backend API (<code className="font-mono text-[11.5px] bg-white px-1">PUT /api/humanoid-specs/{id}</code>) 직접 호출로 부분 업데이트 가능합니다.
            JSONB 카테고리는 `column || patch::jsonb` 머지로 처리됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EditModelPage() {
  return (
    <AuthGuard>
      <EditStub />
    </AuthGuard>
  );
}
