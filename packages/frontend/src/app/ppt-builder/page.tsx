'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';

const TEMPLATES = [
  { id: 'market_overview', name: 'Market Overview', description: '시장 전체 현황 및 세그먼트 분석' },
  { id: 'company_deep_dive', name: 'Company Deep Dive', description: '특정 회사 심층 분석' },
  { id: 'tech_components', name: 'Tech Components', description: '핵심 부품 기술 동향' },
  { id: 'use_case', name: 'Use Case Analysis', description: '적용 사례 및 시연 분석' },
];

const THEMES = [
  { id: 'light', name: 'Light', color: 'bg-white' },
  { id: 'dark', name: 'Dark', color: 'bg-gray-800' },
];

export default function PPTBuilderPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('market_overview');
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [generatedSlides, setGeneratedSlides] = useState<any>(null);
  const [includeCharts, setIncludeCharts] = useState({
    segmentMatrix: true,
    handDistribution: true,
    workforceComparison: true,
    torqueDensity: false,
    topsTimeline: false,
    demoTimeline: true,
  });

  const { data: robots } = useQuery({
    queryKey: ['humanoid-robots-list'],
    queryFn: () => api.getHumanoidRobots({ limit: 100 }),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => api.getCompanies({ limit: '100' }),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generatePPTSlides({
      template: selectedTemplate,
      theme: selectedTheme,
      title: TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Report',
      subtitle: '휴머노이드 로봇 인텔리전스 리포트',
      companyIds: selectedCompanies.length > 0 ? selectedCompanies : undefined,
      robotIds: selectedRobots.length > 0 ? selectedRobots : undefined,
      includeCharts: Object.values(includeCharts).some(Boolean),
      includeTables: true,
    }),
    onSuccess: (data) => {
      setGeneratedSlides(data);
    },
  });

  const toggleRobot = (id: string) => {
    setSelectedRobots(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanies(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleDownload = () => {
    if (!generatedSlides) return;
    
    // JSON으로 다운로드 (실제 PPTX 생성은 pptxgenjs 라이브러리 필요)
    const blob = new Blob([JSON.stringify(generatedSlides, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate}_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">PPT 빌더</h1>
            <p className="mt-2 text-gray-600">
              분석 데이터를 기반으로 프레젠테이션을 자동 생성합니다.
            </p>
            <p className="mt-1 text-sm text-yellow-600">
              ⚠️ Claude API 연동 후 실제 PPT 생성이 가능합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 설정 패널 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 템플릿 선택 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">템플릿 선택</h2>
                <div className="grid grid-cols-2 gap-4">
                  {TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 테마 선택 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">테마 선택</h2>
                <div className="flex gap-4">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedTheme === theme.id
                          ? 'border-blue-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded ${theme.color} border border-gray-300`} />
                      <span className="font-medium text-gray-900">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 포함할 차트 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">포함할 차트</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(includeCharts).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setIncludeCharts(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {key === 'segmentMatrix' && '세그먼트 매트릭스'}
                        {key === 'handDistribution' && 'Hand 타입 분포'}
                        {key === 'workforceComparison' && '인력 비교'}
                        {key === 'torqueDensity' && '토크 밀도 차트'}
                        {key === 'topsTimeline' && 'TOPS 타임라인'}
                        {key === 'demoTimeline' && '시연 타임라인'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 로봇 선택 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  포함할 로봇 ({selectedRobots.length}개 선택)
                </h2>
                <div className="max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {robots?.items?.map((robot: any) => (
                      <label
                        key={robot.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          selectedRobots.includes(robot.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRobots.includes(robot.id)}
                          onChange={() => toggleRobot(robot.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 truncate">{robot.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 회사 선택 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  포함할 회사 ({selectedCompanies.length}개 선택)
                </h2>
                <div className="max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {companies?.items?.map((company: any) => (
                      <label
                        key={company.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          selectedCompanies.includes(company.id) ? 'bg-green-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => toggleCompany(company.id)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700 truncate">{company.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 미리보기 및 생성 */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">미리보기</h2>
                
                <div className={`aspect-video rounded-lg ${
                  selectedTheme === 'dark' ? 'bg-gray-800' :
                  selectedTheme === 'corporate' ? 'bg-blue-900' :
                  'bg-white border border-gray-200'
                } p-4 mb-4`}>
                  <div className={`text-center ${
                    selectedTheme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    <p className="text-lg font-bold">
                      {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                    </p>
                    <p className="text-sm opacity-70 mt-2">
                      휴머노이드 로봇 인텔리전스 리포트
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  <p>• 템플릿: {TEMPLATES.find(t => t.id === selectedTemplate)?.name}</p>
                  <p>• 테마: {THEMES.find(t => t.id === selectedTheme)?.name}</p>
                  <p>• 선택된 로봇: {selectedRobots.length}개</p>
                  <p>• 선택된 회사: {selectedCompanies.length}개</p>
                  <p>• 포함 차트: {Object.values(includeCharts).filter(Boolean).length}개</p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {generateMutation.isPending ? '생성 중...' : 'PPT 슬라이드 생성'}
                </button>

                {generatedSlides && (
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 px-4 mt-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
                  >
                    JSON 다운로드 ({generatedSlides.metadata?.slideCount || 0}개 슬라이드)
                  </button>
                )}

                <p className="text-xs text-gray-500 text-center mt-4">
                  생성된 슬라이드 데이터를 JSON으로 다운로드합니다.
                </p>
              </div>

              {/* 생성된 슬라이드 미리보기 */}
              {generatedSlides && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">생성된 슬라이드</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {generatedSlides.slides?.map((slide: any, idx: number) => (
                      <div key={slide.id} className="border rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-900">
                          {idx + 1}. {slide.title}
                        </p>
                        {slide.subtitle && (
                          <p className="text-xs text-gray-500">{slide.subtitle}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {slide.contents?.length || 0}개 콘텐츠
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
