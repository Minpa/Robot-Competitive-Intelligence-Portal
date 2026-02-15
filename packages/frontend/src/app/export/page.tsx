'use client';

import { useState } from 'react';
import { Download, FileText, Building2, Package } from 'lucide-react';
import { api } from '@/lib/api';

export default function ExportPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (type: string, format: 'csv' | 'json') => {
    setLoading(`${type}-${format}`);
    try {
      let data: string;
      let filename: string;

      switch (type) {
        case 'companies':
          data = await api.exportCompanies(format);
          filename = `companies.${format}`;
          break;
        case 'products':
          data = await api.exportProducts(format, true);
          filename = `products.${format}`;
          break;
        case 'articles':
          data = await api.exportArticles(format);
          filename = `articles.${format}`;
          break;
        default:
          return;
      }

      // Download file
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('내보내기에 실패했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const exportOptions = [
    {
      type: 'companies',
      title: '회사 데이터',
      description: '등록된 모든 회사 정보를 내보냅니다.',
      icon: Building2,
      color: 'bg-blue-500/20 text-blue-400',
    },
    {
      type: 'products',
      title: '제품 데이터',
      description: '제품 정보와 스펙을 포함하여 내보냅니다.',
      icon: Package,
      color: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      type: 'articles',
      title: '기사 데이터',
      description: '수집된 기사 목록을 내보냅니다.',
      icon: FileText,
      color: 'bg-amber-500/20 text-amber-400',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">내보내기</h1>
          <p className="text-slate-400">데이터를 CSV 또는 JSON 형식으로 내보냅니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exportOptions.map((option) => (
            <div key={option.type} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${option.color}`}>
                  <option.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{option.title}</h3>
                  <p className="text-sm text-slate-400">{option.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(option.type, 'csv')}
                  disabled={loading !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg disabled:opacity-50 text-slate-300 transition-colors"
                >
                  {loading === `${option.type}-csv` ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-slate-300" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  CSV
                </button>
                <button
                  onClick={() => handleExport(option.type, 'json')}
                  disabled={loading !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg disabled:opacity-50 text-slate-300 transition-colors"
                >
                  {loading === `${option.type}-json` ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-slate-300" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
