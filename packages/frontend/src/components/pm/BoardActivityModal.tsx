'use client';
// 보드 업데이트 내역 — 활동 로그(셀 변경·아이템 생성 등) + 아이템 코멘트 통합 피드.
import { useEffect, useState } from 'react';
import { History, MessageCircle, Edit3, X } from 'lucide-react';
import { pmApi } from '@/lib/pm-api';

interface Props { boardId: number; onClose: () => void; onOpenItem?: (id: number) => void; }

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

const ACTION_LABEL: Record<string, string> = {
  create: '생성', update: '수정', delete: '삭제',
  set_cell: '셀 변경', set_cells_bulk: '셀 일괄 변경',
  add_member: '멤버 추가', cascade_shift: '의존 자동 시프트',
  automation_set_cell: '자동화 적용', create_from_template: '템플릿 생성',
};

const ENTITY_LABEL: Record<string, string> = {
  project: '프로젝트', board: '보드', item: '아이템', cell: '셀', membership: '멤버십',
  membership_: '멤버십', automation: '자동화',
};

export default function BoardActivityModal({ boardId, onClose, onOpenItem }: Props) {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'log' | 'comment'>('all');

  useEffect(() => {
    setLoading(true);
    pmApi.boardActivity(boardId)
      .then((r) => setFeed(r.activity))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [boardId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visible = feed.filter((f) => filter === 'all' || f.kind === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(26,26,26,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2DED4]">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#A50034]" />
            <h3 className="font-medium text-[15px] text-[#1A1A1A]">업데이트 내역</h3>
            <span className="font-mono text-[10px] text-[#888780]">{visible.length}건</span>
          </div>
          <button onClick={onClose} className="text-[#888780] hover:text-[#1A1A1A]"><X size={16} /></button>
        </div>
        <div className="px-5 py-2 border-b border-[#E2DED4] flex items-center gap-2">
          {([['all', '전체'], ['log', '변경'], ['comment', '코멘트']] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              className={`px-2.5 py-1 text-[11.5px] rounded border ${filter === k ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7] hover:border-[#A50034]'}`}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && <p className="text-[13px] text-[#888780] py-6 text-center">불러오는 중…</p>}
          {!loading && visible.length === 0 && (
            <p className="text-[13px] text-[#B8B6AE] py-10 text-center">업데이트 내역이 없습니다.</p>
          )}
          <ul className="space-y-2">
            {visible.map((f) => {
              const isComment = f.kind === 'comment';
              const Icon = isComment ? MessageCircle : Edit3;
              return (
                <li key={f.id} className={`flex items-start gap-3 p-2.5 rounded-md border ${isComment ? 'bg-[#FAFAF7] border-[#EFEDE6]' : 'bg-white border-[#E2DED4]'}`}>
                  <span className={`mt-0.5 ${isComment ? 'text-[#7E5BB5]' : 'text-[#3C6FA5]'}`}><Icon size={14} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[12px] mb-0.5">
                      <span className="font-medium text-[#1A1A1A]">{f.actor || '알 수 없음'}</span>
                      {isComment ? (
                        <span className="text-[#888780]">{f.itemName ? `· ${f.itemName} 에 코멘트` : '· 코멘트'}</span>
                      ) : (
                        <span className="text-[#888780]">
                          · {ACTION_LABEL[f.action] ?? f.action} · {ENTITY_LABEL[f.entityType] ?? f.entityType}
                          {f.itemName && <span> · {f.itemName}</span>}
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[10.5px] text-[#888780]" title={new Date(f.createdAt).toLocaleString('ko-KR')}>{relTime(f.createdAt)}</span>
                    </div>
                    {isComment && <p className="text-[12.5px] text-[#1A1A1A] whitespace-pre-wrap">{f.body}</p>}
                    {!isComment && f.action === 'cascade_shift' && f.diff?.from?.deltaDays != null && (
                      <p className="text-[11.5px] text-[#5F5E5A]">선행 변화 {f.diff.from.deltaDays > 0 ? '+' : ''}{f.diff.from.deltaDays}일 ({f.diff.from.depType}) → {f.diff.prev?.start} → {f.diff.next?.start}</p>
                    )}
                    {isComment && f.itemId && onOpenItem && (
                      <button onClick={() => { onOpenItem(f.itemId); onClose(); }}
                        className="text-[11px] text-[#A50034] hover:underline mt-1">아이템 열기 →</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="px-5 py-1.5 bg-[#FAFAF7] border-t border-[#E2DED4] text-[10.5px] font-mono text-[#888780]">
          최근 200건 · ESC 닫기
        </div>
      </div>
    </div>
  );
}
