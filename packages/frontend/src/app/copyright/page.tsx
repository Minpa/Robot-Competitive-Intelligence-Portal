'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Mail, FileWarning } from 'lucide-react';

export default function CopyrightPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    articleUrl: '',
    originalUrl: '',
    reason: '',
    additionalInfo: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Copyright report submitted:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-argos-bg">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="bg-argos-successBg border border-argos-success/30 rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-argos-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-argos-success" />
            </div>
            <h2 className="text-xl font-semibold text-argos-successInk mb-2">신고가 접수되었습니다</h2>
            <p className="text-argos-successInk/80">
              검토 후 24시간 이내에 조치하겠습니다.
            </p>
            <p className="text-argos-successInk/60 mt-4 text-sm">
              입력하신 이메일로 처리 결과를 안내드립니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-argos-bg">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-argos-warningBg rounded-lg">
            <FileWarning className="w-6 h-6 text-argos-warning" />
          </div>
          <h1 className="text-3xl font-bold text-argos-ink">저작권 신고 및 삭제 요청</h1>
        </div>
        <p className="text-argos-muted mb-8">
          본 서비스에 게시된 콘텐츠가 귀하의 저작권을 침해한다고 판단되시면
          아래 양식을 통해 신고해 주세요.
        </p>

        <div className="bg-argos-warningBg border border-argos-warning/30 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-argos-warning mt-0.5" />
            <div>
              <h3 className="font-semibold text-argos-warningInk mb-2">안내사항</h3>
              <ul className="text-argos-warningInk/80 text-sm space-y-1">
                <li>• 본 서비스는 기사 본문을 저장하지 않으며, 제목/출처/링크만 제공합니다.</li>
                <li>• 신고 접수 후 24시간 이내에 검토 및 조치합니다.</li>
                <li>• 허위 신고 시 법적 책임이 발생할 수 있습니다.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-argos-surface border border-argos-border rounded-xl p-6 shadow-argos-card">
          <h2 className="text-xl font-semibold mb-6 text-argos-ink">삭제 요청 양식</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-argos-inkSoft mb-2">
                  신고자 성명 <span className="text-argos-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-argos-bg border border-argos-border rounded-lg px-3 py-2 text-argos-ink placeholder-argos-faint focus:ring-2 focus:ring-argos-blue focus:border-argos-blue outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-argos-inkSoft mb-2">
                  이메일 <span className="text-argos-danger">*</span>
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-argos-bg border border-argos-border rounded-lg px-3 py-2 text-argos-ink placeholder-argos-faint focus:ring-2 focus:ring-argos-blue focus:border-argos-blue outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-argos-inkSoft mb-2">
                소속 기관/회사
              </label>
              <input
                type="text"
                className="w-full bg-argos-bg border border-argos-border rounded-lg px-3 py-2 text-argos-ink placeholder-argos-faint focus:ring-2 focus:ring-argos-blue focus:border-argos-blue outline-none"
                placeholder="언론사, 기업명 등"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-argos-inkSoft mb-2">
                삭제 요청 URL (본 서비스 내) <span className="text-argos-danger">*</span>
              </label>
              <input
                type="url"
                required
                className="w-full bg-argos-bg border border-argos-border rounded-lg px-3 py-2 text-argos-ink placeholder-argos-faint focus:ring-2 focus:ring-argos-blue focus:border-argos-blue outline-none"
                placeholder="https://rcip.example.com/articles/..."
                value={formData.articleUrl}
                onChange={(e) => setFormData({ ...formData, articleUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-argos-inkSoft mb-2">
                원본 콘텐츠 URL
              </label>
              <input
                type="url"
                className="w-full bg-argos-bg border border-argos-border rounded-lg px-3 py-2 text-argos-ink placeholder-argos-faint focus:ring-2 focus:ring-argos-blue focus:border-argos-blue outline-none"
                placeholder="https://original-source.com/..."
                value={formData.originalUrl}
                onChange={(e) => setFormData({ ...formData, originalUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-argos-inkSoft mb-2">
                삭제 요청 사유 <span className="text-argos-danger">*</span>
              </label>
              <select
                required
                className="w-full bg-argos-bg border border-argos-border rounded-lg px-3 py-2 text-argos-ink focus:ring-2 focus:ring-argos-blue focus:border-argos-blue outline-none"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              >
                <option value="">선택해주세요</option>
                <option value="copyright">저작권 침해</option>
                <option value="trademark">상표권 침해</option>
                <option value="privacy">개인정보 침해</option>
                <option value="defamation">명예훼손</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-argos-inkSoft mb-2">
                상세 설명
              </label>
              <textarea
                rows={4}
                className="w-full bg-argos-bg border border-argos-border rounded-lg px-3 py-2 text-argos-ink placeholder-argos-faint focus:ring-2 focus:ring-argos-blue focus:border-argos-blue outline-none resize-none"
                placeholder="침해 내용에 대해 상세히 설명해 주세요."
                value={formData.additionalInfo}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
              />
            </div>

            <div className="bg-argos-bgAlt border border-argos-border p-4 rounded-lg">
              <label className="flex items-start gap-3">
                <input type="checkbox" required className="mt-1 accent-blue-500" />
                <span className="text-sm text-argos-muted">
                  본인은 위 내용이 사실임을 확인하며, 허위 신고 시 법적 책임을 질 수 있음을
                  인지하고 있습니다. <span className="text-argos-danger">*</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-argos-blue !text-white py-3 rounded-lg font-medium hover:bg-argos-blueHover transition-colors"
            >
              삭제 요청 제출
            </button>
          </form>
        </div>

        <div className="mt-8 p-4 bg-argos-surface border border-argos-border rounded-xl shadow-argos-card">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-argos-muted" />
            <h3 className="font-semibold text-argos-ink">직접 연락</h3>
          </div>
          <p className="text-argos-muted text-sm">
            양식 외 문의사항은 이메일로 연락해 주세요:
            <a href="mailto:copyright@example.com" className="text-argos-blue hover:text-argos-blueHover ml-1 transition-colors">
              copyright@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
