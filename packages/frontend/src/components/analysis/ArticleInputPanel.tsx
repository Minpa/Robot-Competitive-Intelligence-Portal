'use client';

import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';

interface ParseOptions {
  companies: boolean;
  products: boolean;
  components: boolean;
  applications: boolean;
  keywords: boolean;
  summary: boolean;
}

interface ArticleInputPanelProps {
  onAnalyze: (text: string, options: ParseOptions) => void;
  isLoading: boolean;
}

const OPTION_LABELS: Record<keyof ParseOptions, string> = {
  companies: '회사',
  products: '제품/로봇',
  components: '부품',
  applications: '적용 사례',
  keywords: '키워드',
  summary: '요약',
};

export function ArticleInputPanel({ onAnalyze, isLoading }: ArticleInputPanelProps) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<ParseOptions>({
    companies: true,
    products: true,
    components: true,
    applications: true,
    keywords: true,
    summary: true,
  });

  const toggleOption = (key: keyof ParseOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => {
    if (!text.trim() || text.trim().length < 20) {
      alert('기사 내용을 20자 이상 입력해주세요.');
      return;
    }
    onAnalyze(text, options);
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <FileText className="w-5 h-5 text-violet-400" />
        기사 원문 입력
      </h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="기사 원문을 여기에 붙여넣으세요..."
        rows={16}
        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none resize-none"
      />
      <p className="text-xs text-slate-500 text-right">{text.length.toLocaleString()} 자</p>

      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">분석 옵션</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(OPTION_LABELS) as (keyof ParseOptions)[]).map(key => (
            <button
              key={key}
              onClick={() => toggleOption(key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                options[key]
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {OPTION_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || text.trim().length < 20}
        className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            분석 중...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI 분석 시작
          </span>
        )}
      </button>
    </div>
  );
}
