'use client';

import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalysisResult } from '@/types/insight-pipeline';

interface ManualPasteModeProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  articleTitle: string;
  setArticleTitle: (v: string) => void;
}

const ANALYSIS_OPTIONS = [
  { key: 'companies', label: '회사' },
  { key: 'products', label: '제품·로봇' },
  { key: 'components', label: '부품' },
  { key: 'applications', label: '적용 사례' },
  { key: 'keywords', label: '키워드' },
  { key: 'summary', label: '요약' },
] as const;

const MIN_TEXT_LENGTH = 20;

export function ManualPasteMode({
  onAnalysisComplete,
  isAnalyzing,
  setIsAnalyzing,
  articleTitle,
  setArticleTitle,
}: ManualPasteModeProps) {
  const [rawText, setRawText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ANALYSIS_OPTIONS.map((o) => [o.key, true]))
  );
  const [error, setError] = useState<string | null>(null);

  const handleImageFile = async (file: File) => {
    setError(null);
    setImageName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result);
      // Optionally clear raw text so user sees image is being used
      setRawText('');
    };
    reader.onerror = () => {
      setError('이미지를 읽는 중 오류가 발생했습니다.');
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    await handleImageFile(file);
    e.preventDefault();
  };

  const isTooShort = rawText.length < MIN_TEXT_LENGTH && !imageBase64;
  const canAnalyze = !isTooShort && !isAnalyzing;

  const toggleOption = (key: string) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setError(null);
    setIsAnalyzing(true);

    try {
      // Step 1: Parse article text (or image via OCR)
      const parseResponse = await api.parseArticle(
        rawText.length >= MIN_TEXT_LENGTH ? rawText : undefined,
        undefined,
        options,
        imageBase64 || undefined
      );
      const parsed = parseResponse.result;

      // If OCR was used, populate the textarea with extracted text for user review.
      if (parseResponse.extractedText) {
        setRawText(parseResponse.extractedText);
      }

      // Step 2: Collect all entities for linking
      const allEntities = [
        ...parsed.companies,
        ...parsed.products,
        ...parsed.components,
        ...parsed.applications,
      ];

      // Step 3: Link entities (only if there are entities to link)
      let linkCandidates: Record<string, any[]> = {};
      if (allEntities.length > 0) {
        const linkResponse = await api.linkEntities(allEntities);
        linkCandidates = linkResponse.candidates ?? {};
      }

      // Step 4: Transform into AnalysisResult
      const result: AnalysisResult = {
        summary: parsed.summary,
        entities: {
          companies: parsed.companies,
          products: parsed.products,
          components: parsed.components,
          applications: parsed.applications,
          workforce: [],
          market: [],
          technology: [],
          keywords: parsed.keywords,
        },
        linkCandidates,
      };

      onAnalysisComplete(result);
    } catch (err: any) {
      setError(err?.message ?? '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-ink-700">
        <FileText className="w-5 h-5 text-violet-500" />
        <h2 className="text-lg font-medium">기사 붙여넣기</h2>
      </div>

      {/* Title input */}
      <div>
        <label htmlFor="article-title" className="block text-sm text-ink-500 mb-1.5">
          기사 제목
        </label>
        <input
          id="article-title"
          type="text"
          value={articleTitle}
          onChange={(e) => setArticleTitle(e.target.value)}
          placeholder="기사 제목을 입력하세요"
          className="w-full px-4 py-2.5 bg-ink-100 border border-ink-200 rounded-lg text-ink-700 placeholder-ink-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm text-ink-500 mb-1.5">이미지에서 텍스트 추출</label>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageFile(file);
              }
            }}
            className="text-sm text-ink-700"
          />

          {imageName && (
            <div className="flex items-center justify-between gap-2 text-xs text-ink-700">
              <span className="truncate">{imageName}</span>
              <button
                type="button"
                onClick={() => {
                  setImageBase64(null);
                  setImageName(null);
                }}
                className="text-violet-600 hover:text-violet-800"
              >
                이미지 삭제
              </button>
            </div>
          )}

          {imageBase64 && (
            <div className="border border-ink-200 rounded-lg overflow-hidden">
              <img
                src={imageBase64}
                alt="업로드된 스크린샷"
                className="w-full h-auto max-h-60 object-contain"
              />
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-400">
          스크린샷을 붙여넣거나 업로드하면 OCR로 텍스트를 추출하여 분석할 수 있습니다.
        </p>
      </div>

      {/* Text area */}
      <div>
        <label htmlFor="article-text" className="block text-sm text-ink-500 mb-1.5">
          기사 본문 <span className="text-ink-400">(한국어·영어·일본어 등 다국어 지원)</span>
        </label>
        <textarea
          id="article-text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onPaste={handlePaste}
          placeholder="기사 원문을 붙여넣으세요 (최소 20자)"
          rows={12}
          className="w-full px-4 py-3 bg-ink-100 border border-ink-200 rounded-lg text-ink-700 placeholder-ink-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-y"
        />
        {rawText.length > 0 && isTooShort && (
          <p className="mt-1.5 text-xs text-amber-500">
            최소 20자 이상 입력해야 분석할 수 있습니다. (현재 {rawText.length}자)
          </p>
        )}
      </div>

      {/* Analysis options */}
      <div>
        <p className="text-sm text-ink-500 mb-2">분석 옵션</p>
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleOption(opt.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                options[opt.key]
                  ? 'bg-violet-500/10 text-violet-600 border-violet-500/30'
                  : 'bg-ink-100 text-ink-400 border-ink-200 hover:border-ink-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-neg bg-neg-soft border border-red-500/20 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 !text-white"
      >
        <Sparkles className="w-4 h-4" />
        {isAnalyzing ? 'AI 분석 중...' : 'AI 분석 시작'}
      </button>
    </div>
  );
}
