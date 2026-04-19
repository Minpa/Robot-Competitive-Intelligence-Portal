'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import {
  FileText, Upload, Search, Trash2, ExternalLink, Link2, Unlink,
  ChevronDown, ChevronRight, Eye, X, Filter, Tag, Globe, Shield,
  Scale, Lock, AlertTriangle, File, Maximize2, Minimize2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

const CATEGORY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'policy', label: '정책·산업규제' },
  { value: 'safety', label: '물리적·기능적 안전' },
  { value: 'legal', label: '법적 책임·배상' },
  { value: 'privacy', label: '개인정보보호' },
];

const REGION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'korea', label: '🇰🇷 한국' },
  { value: 'us', label: '🇺🇸 미국' },
  { value: 'eu', label: '🇪🇺 EU' },
  { value: 'china', label: '🇨🇳 중국' },
  { value: 'international', label: '🌐 국제' },
];

const CATEGORY_ICONS: Record<string, any> = {
  policy: Globe, safety: Shield, legal: Scale, privacy: Lock,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function RegulatoryDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadRegion, setUploadRegion] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Viewer state
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [viewerFullscreen, setViewerFullscreen] = useState(false);

  // Link to checklist state
  const [linkingDoc, setLinkingDoc] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [linkPages, setLinkPages] = useState('');
  const [linkNote, setLinkNote] = useState('');
  const [selectedChecklistId, setSelectedChecklistId] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.regulatoryDocuments.list({
        search: searchQuery || undefined,
        category: filterCategory || undefined,
        region: filterRegion || undefined,
      });
      setDocuments(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
    setLoading(false);
  }, [searchQuery, filterCategory, filterRegion]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      await api.regulatoryDocuments.upload(uploadFile, {
        title: uploadTitle || uploadFile.name,
        description: uploadDescription || undefined,
        category: uploadCategory || undefined,
        region: uploadRegion || undefined,
      });
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('');
      setUploadRegion('');
      await loadDocuments();
    } catch (err: any) {
      alert('업로드 실패: ' + err.message);
    }
    setUploading(false);
  }

  async function handleDelete(doc: any) {
    if (!confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) return;
    try {
      await api.regulatoryDocuments.delete(doc.id);
      await loadDocuments();
      if (viewingDoc?.id === doc.id) setViewingDoc(null);
    } catch (err: any) {
      alert('삭제 실패: ' + err.message);
    }
  }

  async function openLinkDialog(doc: any) {
    setLinkingDoc(doc);
    setLinkPages('');
    setLinkNote('');
    setSelectedChecklistId('');
    try {
      const items = await api.compliance.getChecklist({});
      setChecklistItems(items);
    } catch (_err) { /* silent */ }
  }

  async function handleLink() {
    if (!linkingDoc || !selectedChecklistId) return;
    try {
      await api.regulatoryDocuments.linkChecklist(linkingDoc.id, selectedChecklistId, linkPages || undefined, linkNote || undefined);
      setLinkingDoc(null);
      await loadDocuments();
    } catch (err: any) {
      alert('연결 실패: ' + err.message);
    }
  }

  async function handleUnlink(docId: string, checklistItemId: string) {
    try {
      await api.regulatoryDocuments.unlinkChecklist(docId, checklistItemId);
      await loadDocuments();
    } catch (err: any) {
      alert('연결 해제 실패: ' + err.message);
    }
  }

  function openViewer(doc: any, page?: string) {
    setViewingDoc(doc);
    setViewerFullscreen(false);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        module="COMPLIANCE MODULE V4.2"
        titleKo="규제 문서 라이브러리"
        titleEn="DOCUMENT LIBRARY"
        description="ISO, EU AI Act, 지능형로봇법 등 규제 원문을 업로드하고 체크리스트와 연계하세요"
        actions={
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition"
          >
            <Upload className="w-4 h-4" />
            문서 업로드
          </button>
        }
      />

      {/* Upload Panel */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-violet-500/30 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-violet-400 flex items-center gap-2">
            <Upload className="w-4 h-4" /> 새 문서 업로드
          </h3>

          {/* Drop zone / file input */}
          <div
            className="border-2 border-dashed border-ink-100 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500/50 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploadFile(f);
                  if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ''));
                }
              }}
            />
            {uploadFile ? (
              <div className="flex items-center justify-center gap-3">
                <File className="w-8 h-8 text-violet-400" />
                <div className="text-left">
                  <p className="text-sm text-ink-700">{uploadFile.name}</p>
                  <p className="text-xs text-ink-500">{formatFileSize(uploadFile.size)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); }} className="text-ink-400 hover:text-ink-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-ink-400 mx-auto mb-2" />
                <p className="text-sm text-ink-500">클릭하여 파일 선택</p>
                <p className="text-xs text-ink-400 mt-1">PDF, Word, Excel, PowerPoint (최대 20MB)</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">문서 제목</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="예: ISO 10218:2025 전문"
                className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-500 mb-1 block">카테고리</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-violet-500"
                >
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1 block">지역</label>
                <select
                  value={uploadRegion}
                  onChange={(e) => setUploadRegion(e.target.value)}
                  className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-violet-500"
                >
                  {REGION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1 block">설명 (선택)</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="예: 2025년 개정판 전문. 374페이지. 기능안전 및 사이버보안 조항 신설."
              className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-violet-500 resize-none h-16"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-900 transition">취소</button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-info-soft/50 disabled:text-ink-400 text-white rounded-lg text-sm transition"
            >
              {uploading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문서 검색..."
            className="w-full bg-white border border-ink-200 rounded-lg pl-10 pr-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-violet-500"
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-violet-500"
        >
          {REGION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Document list + Viewer layout */}
      <div className={`grid gap-6 ${viewingDoc ? 'grid-cols-1 lg:grid-cols-[360px_1fr]' : 'grid-cols-1'}`}>
        {/* Document List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-ink-200 animate-pulse">
                  <div className="h-4 bg-info-soft/50 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-info-soft/50 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-xl border border-ink-200 p-12 text-center">
              <FileText className="w-12 h-12 text-ink-400 mx-auto mb-3" />
              <p className="text-ink-500">업로드된 문서가 없습니다</p>
              <p className="text-xs text-ink-400 mt-1">ISO 10218, EU AI Act 등의 원문 PDF를 업로드하세요</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-400">{total}건의 문서</p>
              {documents.map((doc) => {
                const CatIcon = CATEGORY_ICONS[doc.category] || FileText;
                const isActive = viewingDoc?.id === doc.id;
                const links = (doc.linkedChecklistItems || []) as { checklistItemId: string; pages?: string; note?: string }[];
                const isPdf = doc.mimeType === 'application/pdf';

                return (
                  <div
                    key={doc.id}
                    className={`bg-white rounded-xl border p-4 transition cursor-pointer hover:border-info/30 ${isActive ? 'border-violet-500/50 bg-violet-500/5' : 'border-ink-200'}`}
                    onClick={() => isPdf ? openViewer(doc) : undefined}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-500/10' : 'bg-info-soft/50'}`}>
                        {isPdf ? <FileText className="w-4 h-4 text-red-400" /> : <File className="w-4 h-4 text-ink-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-700 truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CatIcon className="w-3 h-3 text-ink-400" />
                          <span className="text-[10px] text-ink-400">{formatFileSize(doc.fileSize)}</span>
                          <span className="text-[10px] text-ink-400">·</span>
                          <span className="text-[10px] text-ink-400">
                            {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-ink-400 mt-1 line-clamp-2">{doc.description}</p>
                        )}
                        {/* Linked checklist items */}
                        {links.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {links.map((link, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                                <Link2 className="w-2.5 h-2.5" />
                                {link.pages && `p.${link.pages}`}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUnlink(doc.id, link.checklistItemId); }}
                                  className="hover:text-red-400 ml-0.5"
                                  title="연결 해제"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isPdf && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openViewer(doc); }}
                            className="p-1.5 text-ink-400 hover:text-violet-400 transition rounded-lg hover:bg-ink-100"
                            title="미리보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openLinkDialog(doc); }}
                          className="p-1.5 text-ink-400 hover:text-blue-400 transition rounded-lg hover:bg-ink-100"
                          title="체크리스트 연결"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                          className="p-1.5 text-ink-400 hover:text-red-400 transition rounded-lg hover:bg-ink-100"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* PDF Viewer */}
        {viewingDoc && (
          <div className={`bg-white rounded-xl border border-ink-200 overflow-hidden flex flex-col ${viewerFullscreen ? 'fixed inset-4 z-50' : 'h-[calc(100vh-200px)]'}`}>
            {/* Viewer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 bg-white flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-700 truncate">{viewingDoc.title}</p>
                <p className="text-xs text-ink-400">{viewingDoc.filename}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <a
                  href={api.regulatoryDocuments.getFileUrl(viewingDoc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-ink-500 hover:text-ink-900 transition rounded-lg hover:bg-ink-100"
                  title="새 탭에서 열기"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setViewerFullscreen(!viewerFullscreen)}
                  className="p-1.5 text-ink-500 hover:text-ink-900 transition rounded-lg hover:bg-ink-100"
                  title={viewerFullscreen ? '축소' : '전체 화면'}
                >
                  {viewerFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setViewingDoc(null); setViewerFullscreen(false); }}
                  className="p-1.5 text-ink-500 hover:text-ink-900 transition rounded-lg hover:bg-ink-100"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* PDF embed */}
            <div className="flex-1 relative">
              {viewingDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={api.regulatoryDocuments.getFileUrl(viewingDoc.id)}
                  className="w-full h-full border-0"
                  title={viewingDoc.title}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-ink-400">
                  <div className="text-center">
                    <File className="w-12 h-12 mx-auto mb-3 text-ink-400" />
                    <p>이 파일 형식은 미리보기를 지원하지 않습니다</p>
                    <a
                      href={api.regulatoryDocuments.getFileUrl(viewingDoc.id)}
                      download
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-info-soft/50 rounded-lg text-sm text-ink-700 hover:bg-ink-100 transition"
                    >
                      <ExternalLink className="w-4 h-4" /> 다운로드
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Link to Checklist Modal */}
      {linkingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl border border-ink-200 w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-400" />
                체크리스트 항목과 연결
              </h3>
              <button onClick={() => setLinkingDoc(null)} className="text-ink-400 hover:text-ink-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-500">
              <span className="font-medium text-ink-700">{linkingDoc.title}</span> 문서를 체크리스트 항목과 연결합니다.
            </p>

            <div>
              <label className="text-xs text-ink-500 mb-1 block">체크리스트 항목 선택</label>
              <select
                value={selectedChecklistId}
                onChange={(e) => setSelectedChecklistId(e.target.value)}
                className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-blue-500"
              >
                <option value="">선택하세요...</option>
                {checklistItems.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.category}] {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-500 mb-1 block">관련 페이지 (선택)</label>
                <input
                  type="text"
                  value={linkPages}
                  onChange={(e) => setLinkPages(e.target.value)}
                  placeholder="예: 45-52, 120"
                  className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1 block">메모 (선택)</label>
                <input
                  type="text"
                  value={linkNote}
                  onChange={(e) => setLinkNote(e.target.value)}
                  placeholder="예: 사이버보안 조항"
                  className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setLinkingDoc(null)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-900 transition">취소</button>
              <button
                onClick={handleLink}
                disabled={!selectedChecklistId}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-info-soft/50 disabled:text-ink-400 text-white rounded-lg text-sm transition"
              >
                연결
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
