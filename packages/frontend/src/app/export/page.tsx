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
      color: 'bg-blue-100 text-blue-600',
    },
    {
      type: 'products',
      title: '제품 데이터',
      description: '제품 정보와 스펙을 포함하여 내보냅니다.',
      icon: Package,
      color: 'bg-green-100 text-green-600',
    },
    {
      type: 'articles',
      title: '기사 데이터',
      description: '수집된 기사 목록을 내보냅니다.',
      icon: FileText,
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내보내기</h1>
        <p className="text-gray-500">데이터를 CSV 또는 JSON 형식으로 내보냅니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportOptions.map((option) => (
          <div key={option.type} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-lg ${option.color}`}>
                <option.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">{option.title}</h3>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(option.type, 'csv')}
                disabled={loading !== null}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                {loading === `${option.type}-csv` ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                CSV
              </button>
              <button
                onClick={() => handleExport(option.type, 'json')}
                disabled={loading !== null}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                {loading === `${option.type}-json` ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
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
  );
}
