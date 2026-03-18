'use client';

import { X, ExternalLink, Play } from 'lucide-react';

interface RobotInfo {
  id: string;
  name: string;
  companyName: string;
  mainSpec: string;
  role: string;
  imageUrl?: string;
}

interface QuantitativeEffect {
  label: string;
  before?: string | number;
  after?: string | number;
  improvement?: string;
}

interface RelatedLink {
  type: 'article' | 'video';
  title: string;
  url: string;
  source?: string;
}

interface CaseDetail {
  id: string;
  title: string;
  status: string;
  environment: string;
  spaceType?: string;
  taskType: string;
  period?: string;
  description?: string;
  robots: RobotInfo[];
  beforeProcess?: string;
  afterProcess?: string;
  effects: QuantitativeEffect[];
  relatedLinks: RelatedLink[];
}

interface CaseDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  caseDetail: CaseDetail | null;
}

const ENVIRONMENT_LABELS: Record<string, string> = {
  factory: '공장',
  warehouse: '물류센터',
  retail: '리테일',
  healthcare: '병원',
  hospitality: '호텔',
  home: '가정',
  research_lab: '연구소',
  other: '기타',
};

const TASK_LABELS: Record<string, string> = {
  assembly: '조립',
  picking: '피킹',
  packing: '포장',
  inspection: '검사',
  delivery: '배송',
  cleaning: '청소',
  assistance: '보조',
  transport: '운반',
  service: '서비스',
  other: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  production: '상용',
  pilot: '파일럿',
  poc: 'PoC',
  expanding: '확대 중',
  ended: '종료',
};

export function CaseDetailDrawer({ isOpen, onClose, caseDetail }: CaseDetailDrawerProps) {
  if (!isOpen || !caseDetail) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-slate-900 shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100 line-clamp-1">{caseDetail.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 개요 섹션 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">📋 개요</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-800 rounded p-3">
                <div className="text-slate-400 text-xs mb-1">환경</div>
                <div className="font-medium">{ENVIRONMENT_LABELS[caseDetail.environment] || caseDetail.environment}</div>
              </div>
              <div className="bg-slate-800 rounded p-3">
                <div className="text-slate-400 text-xs mb-1">적용 공간</div>
                <div className="font-medium">{caseDetail.spaceType || '-'}</div>
              </div>
              <div className="bg-slate-800 rounded p-3">
                <div className="text-slate-400 text-xs mb-1">작업 Type</div>
                <div className="font-medium">{TASK_LABELS[caseDetail.taskType] || caseDetail.taskType}</div>
              </div>
              <div className="bg-slate-800 rounded p-3">
                <div className="text-slate-400 text-xs mb-1">상태</div>
                <div className="font-medium">{STATUS_LABELS[caseDetail.status] || caseDetail.status}</div>
              </div>
              {caseDetail.period && (
                <div className="bg-slate-800 rounded p-3 col-span-2">
                  <div className="text-slate-400 text-xs mb-1">적용 기간</div>
                  <div className="font-medium">{caseDetail.period}</div>
                </div>
              )}
            </div>
            {caseDetail.description && (
              <p className="mt-3 text-sm text-slate-400">{caseDetail.description}</p>
            )}
          </section>

          {/* 사용 로봇 목록 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">🤖 사용 로봇</h3>
            <div className="space-y-3">
              {caseDetail.robots.length > 0 ? (
                caseDetail.robots.map((robot) => (
                  <div key={robot.id} className="flex gap-3 p-3 bg-slate-800 rounded-lg">
                    {robot.imageUrl ? (
                      <img src={robot.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-700 rounded flex items-center justify-center text-2xl">
                        🤖
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-slate-100">{robot.name}</div>
                      <div className="text-xs text-slate-400">{robot.companyName}</div>
                      <div className="text-xs text-slate-500 mt-1">{robot.mainSpec}</div>
                      <div className="text-xs text-blue-600 mt-1">역할: {robot.role}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">로봇 정보가 없습니다.</p>
              )}
            </div>
          </section>

          {/* Before vs After 프로세스 */}
          {(caseDetail.beforeProcess || caseDetail.afterProcess) && (
            <section>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">🔄 프로세스 변화</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/10 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-400 mb-2">Before</div>
                  <p className="text-sm text-slate-300">{caseDetail.beforeProcess || '-'}</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-400 mb-2">After</div>
                  <p className="text-sm text-slate-300">{caseDetail.afterProcess || '-'}</p>
                </div>
              </div>
            </section>
          )}

          {/* 정량 효과 */}
          {caseDetail.effects.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">📊 정량 효과</h3>
              <div className="space-y-2">
                {caseDetail.effects.map((effect, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <span className="text-sm text-slate-300">{effect.label}</span>
                    <div className="flex items-center gap-2 text-sm">
                      {effect.before && (
                        <span className="text-slate-500">{effect.before}</span>
                      )}
                      {effect.before && effect.after && (
                        <span className="text-slate-400">→</span>
                      )}
                      {effect.after && (
                        <span className="font-medium text-slate-100">{effect.after}</span>
                      )}
                      {effect.improvement && (
                        <span className="text-green-600 font-medium">({effect.improvement})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 관련 기사·영상 링크 */}
          {caseDetail.relatedLinks.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">🔗 관련 자료</h3>
              <div className="space-y-2">
                {caseDetail.relatedLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded hover:bg-slate-700 transition-colors"
                  >
                    {link.type === 'video' ? (
                      <Play className="w-4 h-4 text-red-500" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-blue-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate">{link.title}</div>
                      {link.source && (
                        <div className="text-xs text-slate-400">{link.source}</div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
