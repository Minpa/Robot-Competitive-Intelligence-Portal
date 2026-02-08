'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Sparkles,
  Building2,
  Package,
  Tag,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Settings,
  Zap,
  RefreshCw,
  PlayCircle,
  Trash2,
} from 'lucide-react';

interface FormFactor {
  arms?: number;
  hands?: string;
  mobility?: string;
  heightCm?: number;
  payloadKg?: number;
}

interface DynamicSpecs {
  // SoC 스펙
  tops?: number;
  npuTops?: number;
  process?: string;
  tdpWatts?: string;
  memory?: string;
  memorySize?: string;
  memoryBandwidth?: string;
  cpuCores?: string;
  gpuCores?: string;
  gpuModel?: string;
  // 액츄에이터 스펙
  torqueNm?: number;
  rpmMax?: number;
  gearRatio?: string;
  // 기타 동적 필드
  [key: string]: string | number | boolean | null | undefined;
}

interface AnalyzedData {
  companies: Array<{ name: string; country: string; category: string; description?: string }>;
  products: Array<{ name: string; companyName: string; type: string; releaseDate?: string; description?: string; formFactor?: FormFactor; specs?: DynamicSpecs }>;
  articles: Array<{ title: string; source: string; url?: string; summary: string; category: string; productType: string }>;
  keywords: string[];
  summary: string;
}

interface SaveResult {
  companiesSaved: number;
  productsSaved: number;
  articlesSaved: number;
  keywordsSaved?: number;
  errors: string[];
}

interface AutoQueryTopic {
  id: string;
  label: string;
  query: string;
}

// 기본 카테고리 설정
const DEFAULT_PRODUCT_TYPES = [
  'humanoid', 'service', 'logistics', 'industrial', 'quadruped', 
  'cobot', 'amr', 'foundation_model', 'actuator', 'soc'
];

const DEFAULT_COMPANY_CATEGORIES = [
  'robotics', 'AI', 'semiconductor', 'actuator', 'automation'
];

const DEFAULT_COUNTRIES = [
  'USA', 'Japan', 'China', 'Germany', 'Korea', 'Denmark', 'Switzerland', 'France', 'UK', 'Taiwan'
];

// 기본 자동 질의 주제 옵션
const DEFAULT_AUTO_QUERY_TOPICS: AutoQueryTopic[] = [
  { id: 'humanoid', label: '휴머노이드 로봇', query: '휴머노이드 로봇 시장의 주요 기업들과 제품들을 분석해줘. Tesla Optimus, Figure, Agility Robotics, Boston Dynamics, 1X Technologies, Apptronik, Unitree, UBTECH 등 주요 기업의 제품, 출시일, 매출규모, 시장점유율, 기술 특징을 포함해줘. 각 로봇 제품의 Form Factor 정보도 포함해줘: 팔 개수(0/1/2), 핸드 타입(none/gripper/3finger/5finger), 이동방식(fixed/wheel/biped), 높이(cm), 페이로드(kg).' },
  { id: 'cobot', label: '협동로봇 (Cobot)', query: '협동로봇(Cobot) 시장의 주요 기업들과 제품들을 분석해줘. Universal Robots, FANUC, ABB, KUKA, Doosan Robotics, Techman Robot 등 주요 기업의 제품 라인업, 출시일, 매출규모, 시장점유율을 포함해줘. 각 로봇 제품의 Form Factor 정보도 포함해줘: 팔 개수(0/1/2), 핸드 타입(none/gripper/3finger/5finger), 이동방식(fixed/wheel), 높이(cm), 페이로드(kg).' },
  { id: 'amr', label: 'AMR/물류로봇', query: 'AMR(자율이동로봇)과 물류로봇 시장의 주요 기업들과 제품들을 분석해줘. Amazon Robotics, Locus Robotics, 6 River Systems, Fetch Robotics, MiR, Geek+ 등 주요 기업의 제품, 출시일, 매출규모, 시장점유율을 포함해줘. 각 로봇 제품의 Form Factor 정보도 포함해줘: 팔 개수(0/1/2), 핸드 타입(none/gripper), 이동방식(wheel/track), 높이(cm), 페이로드(kg).' },
  { id: 'foundation_model', label: 'RFM (로봇 파운데이션 모델)', query: '로봇 파운데이션 모델(Robot Foundation Model) 분야의 주요 기업들과 모델들을 분석해줘. Google RT-1/RT-2/RT-X, Physical Intelligence π₀, NVIDIA Isaac, OpenAI 등 주요 기업의 모델, 발표일, 기술 특징, 시장 영향력을 포함해줘.' },
  { id: 'actuator', label: '액츄에이터/부품', query: '로봇 액츄에이터와 핵심 부품 시장의 주요 기업들과 제품들을 분석해줘. Harmonic Drive, Nabtesco, Maxon, Faulhaber 등 주요 기업의 제품, 매출규모, 시장점유율, 기술 특징을 포함해줘. 각 액츄에이터의 스펙 정보도 포함해줘: 토크(Nm), 최대 RPM, 기어비, 무게(kg).' },
  { id: 'quadruped', label: '사족보행 로봇', query: '사족보행 로봇 시장의 주요 기업들과 제품들을 분석해줘. Boston Dynamics Spot, Unitree Go1/Go2/B2, ANYbotics ANYmal, Ghost Robotics 등 주요 기업의 제품, 출시일, 가격, 매출규모, 시장점유율을 포함해줘. 각 로봇 제품의 Form Factor 정보도 포함해줘: 팔 개수(0/1/2), 핸드 타입(none/gripper), 이동방식(quadruped), 높이(cm), 페이로드(kg).' },
  { id: 'service', label: '서비스 로봇', query: '서비스 로봇 시장의 주요 기업들과 제품들을 분석해줘. 배달로봇, 안내로봇, 청소로봇 등 분야별 주요 기업의 제품, 출시일, 매출규모, 시장점유율을 포함해줘. 각 로봇 제품의 Form Factor 정보도 포함해줘: 팔 개수(0/1/2), 핸드 타입(none/gripper), 이동방식(wheel/track), 높이(cm), 페이로드(kg).' },
  { id: 'soc_edge', label: 'SoC (엣지/임베디드)', query: '임베디드·엣지 AI용 SoC 시장을 분석해줘. NVIDIA Jetson (Orin Nano, Orin NX, AGX Orin), Google Edge TPU, Qualcomm QCS8250, NXP i.MX 93, Rockchip RK3588, Renesas RZ/V2L, Intel Myriad X, Sony IMX500 등 주요 제품의 스펙을 포함해줘: TOPS, 공정(nm), 전력소비(W), 메모리 타입, 메모리 대역폭, CPU/GPU 코어 구성, 타겟 용도.' },
  { id: 'soc_mobile', label: 'SoC (모바일)', query: '모바일 SoC 시장을 분석해줘. Apple A시리즈(A14~A19), Google Tensor(G1~G4), Qualcomm Snapdragon 8 Gen 3, MediaTek Dimensity 9300/9400 등 주요 제품의 스펙을 포함해줘: TOPS, NPU TOPS, 공정(nm), 메모리 타입, GPU 모델, 탑재 기기.' },
  { id: 'soc_pc', label: 'SoC (PC/노트북)', query: 'PC·노트북용 AI SoC 시장을 분석해줘. AMD Ryzen AI 9 (Strix Point), Intel Core Ultra (Meteor Lake, Arrow Lake, Lunar Lake), Qualcomm Snapdragon X Elite/Plus 등 주요 제품의 스펙을 포함해줘: 총 TOPS, NPU TOPS, 공정(nm), GPU 모델, CPU 코어 구성.' },
  { id: 'soc_datacenter', label: 'SoC (데이터센터)', query: '데이터센터용 AI 가속기 시장을 분석해줘. Google TPU(v4~v7), Amazon Inferentia/Trainium, Microsoft Maia, NVIDIA A100/H100/H200/B100/B200, AMD Instinct MI300 등 주요 제품의 스펙을 포함해줘: TOPS, 공정(nm), 메모리 타입, 메모리 용량, 메모리 대역폭(TB/s).' },
];

const STORAGE_KEY = 'rcip_categories';
const AUTO_QUERY_STORAGE_KEY = 'rcip_auto_query_topics';

export default function AnalyzePage() {
  const [text, setText] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAutoQuery, setShowAutoQuery] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoQuerying, setIsAutoQuerying] = useState(false);
  const [isBulkCollecting, setIsBulkCollecting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentTopic: '' });
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState<AnalyzedData | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [bulkResult, setBulkResult] = useState<{ total: SaveResult; topics: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [categoryUpdated, setCategoryUpdated] = useState(false);

  // 카테고리 상태
  const [productTypes, setProductTypes] = useState<string[]>(DEFAULT_PRODUCT_TYPES);
  const [companyCategories, setCompanyCategories] = useState<string[]>(DEFAULT_COMPANY_CATEGORIES);
  const [countries, setCountries] = useState<string[]>(DEFAULT_COUNTRIES);
  const [autoQueryTopics, setAutoQueryTopics] = useState<AutoQueryTopic[]>(DEFAULT_AUTO_QUERY_TOPICS);
  const [newProductType, setNewProductType] = useState('');
  const [newCompanyCategory, setNewCompanyCategory] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newAutoQueryLabel, setNewAutoQueryLabel] = useState('');

  // 로컬 스토리지에서 카테고리 및 자동 질의 주제 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.productTypes) setProductTypes(parsed.productTypes);
        if (parsed.companyCategories) setCompanyCategories(parsed.companyCategories);
        if (parsed.countries) setCountries(parsed.countries);
      } catch (e) {
        console.error('Failed to load categories:', e);
      }
    }
    
    const savedTopics = localStorage.getItem(AUTO_QUERY_STORAGE_KEY);
    if (savedTopics) {
      try {
        const parsed = JSON.parse(savedTopics);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAutoQueryTopics(parsed);
        }
      } catch (e) {
        console.error('Failed to load auto query topics:', e);
      }
    }
  }, []);

  // 카테고리 저장 및 알림
  const saveCategories = (types: string[], categories: string[], ctrs: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      productTypes: types,
      companyCategories: categories,
      countries: ctrs,
    }));
    setCategoryUpdated(true);
    setTimeout(() => setCategoryUpdated(false), 2000);
  };

  // 자동 질의 주제 저장
  const saveAutoQueryTopics = (topics: AutoQueryTopic[]) => {
    localStorage.setItem(AUTO_QUERY_STORAGE_KEY, JSON.stringify(topics));
    setAutoQueryTopics(topics);
  };

  // 자동 질의 주제 추가
  const addAutoQueryTopic = () => {
    if (newAutoQueryLabel.trim()) {
      const id = newAutoQueryLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (!autoQueryTopics.find(t => t.id === id)) {
        const newTopic: AutoQueryTopic = {
          id,
          label: newAutoQueryLabel.trim(),
          query: `${newAutoQueryLabel.trim()} 시장의 주요 기업들과 제품들을 분석해줘. 주요 기업의 제품, 출시일, 매출규모, 시장점유율, 기술 특징을 포함해줘. 각 로봇 제품의 Form Factor 정보도 포함해줘: 팔 개수(0/1/2), 핸드 타입(none/gripper/3finger/5finger), 이동방식(fixed/wheel/track/quadruped/biped), 높이(cm), 페이로드(kg).`,
        };
        const updated = [...autoQueryTopics, newTopic];
        saveAutoQueryTopics(updated);
        setNewAutoQueryLabel('');
      }
    }
  };

  // 자동 질의 주제 삭제
  const removeAutoQueryTopic = (id: string) => {
    const updated = autoQueryTopics.filter(t => t.id !== id);
    saveAutoQueryTopics(updated);
  };

  // 전체 수집 함수
  const handleBulkCollect = async () => {
    if (autoQueryTopics.length === 0) {
      setError('수집할 카테고리가 없습니다.');
      return;
    }

    setIsBulkCollecting(true);
    setError(null);
    setSaveResult(null);
    setBulkResult(null);
    
    const totalResult: SaveResult = {
      companiesSaved: 0,
      productsSaved: 0,
      articlesSaved: 0,
      keywordsSaved: 0,
      errors: [],
    };
    const completedTopics: string[] = [];

    for (let i = 0; i < autoQueryTopics.length; i++) {
      const topic = autoQueryTopics[i];
      setBulkProgress({ current: i + 1, total: autoQueryTopics.length, currentTopic: topic.label });
      
      try {
        // GPT-4o 질의
        const result = await api.autoQuery(topic.id, topic.query);
        
        if (result && (result.companies.length > 0 || result.products.length > 0)) {
          // DB 저장
          const saveResponse = await api.analyzeAndSave(JSON.stringify(result));
          
          totalResult.companiesSaved += saveResponse.saved.companiesSaved;
          totalResult.productsSaved += saveResponse.saved.productsSaved;
          totalResult.articlesSaved += saveResponse.saved.articlesSaved;
          totalResult.keywordsSaved = (totalResult.keywordsSaved || 0) + (saveResponse.saved.keywordsSaved || 0);
          totalResult.errors.push(...saveResponse.saved.errors);
          
          completedTopics.push(topic.label);
        }
      } catch (err) {
        totalResult.errors.push(`${topic.label}: ${(err as Error).message}`);
      }
      
      // API 호출 간 딜레이 (rate limit 방지)
      if (i < autoQueryTopics.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setBulkResult({ total: totalResult, topics: completedTopics });
    setIsBulkCollecting(false);
    setBulkProgress({ current: 0, total: 0, currentTopic: '' });
  };

  // 동적 프롬프트 생성 (더 세세한 분석 요청)
  const generatePrompt = () => {
    return `아래 JSON 형식으로 로봇 산업 데이터를 상세히 정리해줘:

{
  "companies": [
    { 
      "name": "회사명 (영문)", 
      "country": "${countries.join('/')} 중 하나", 
      "category": "${companyCategories.join('/')} 중 하나",
      "description": "회사 설명 (설립연도, 주요 사업, 매출규모, 직원수, 시장 위치 등 포함)"
    }
  ],
  "products": [
    { 
      "name": "제품/모델명", 
      "companyName": "제조사명", 
      "type": "${productTypes.join('/')} 중 하나", 
      "releaseDate": "YYYY-MM 형식 (예: 2023-06, 2024-01)", 
      "description": "제품 설명 (주요 스펙, 가격대, 판매량, 시장 반응, 경쟁 제품 대비 특징 등 포함)",
      "formFactor": {
        "arms": "팔 개수 (0/1/2) - 로봇용",
        "hands": "핸드 타입 (none/gripper/3finger/4finger/5finger) - 로봇용",
        "mobility": "이동 방식 (fixed/wheel/track/quadruped/biped) - 로봇용",
        "heightCm": "로봇 높이 (cm 숫자) - 로봇용",
        "payloadKg": "페이로드 용량 (kg 숫자) - 로봇용"
      },
      "specs": {
        "tops": "AI 연산 성능 (TOPS 숫자) - SoC용",
        "npuTops": "NPU 전용 TOPS - SoC용",
        "process": "공정 (예: 7nm, TSMC N5) - SoC용",
        "tdpWatts": "전력 소비 (예: 15-60W) - SoC용",
        "memory": "메모리 타입 (예: HBM2, LPDDR5) - SoC용",
        "memorySize": "메모리 용량 (예: 64GB) - SoC용",
        "memoryBandwidth": "메모리 대역폭 (예: 1.2 TB/s) - SoC용",
        "cpuCores": "CPU 코어 구성 (예: 12-core Arm CPU) - SoC용",
        "gpuCores": "GPU 코어 (예: 2048-core Ampere GPU) - SoC용",
        "torqueNm": "토크 (Nm 숫자) - 액츄에이터용",
        "rpmMax": "최대 RPM - 액츄에이터용"
      }
    }
  ],
  "keywords": ["키워드1", "키워드2", "...최대 15개"],
  "summary": "한국어 요약 3-5문장 (시장 트렌드, 주요 기업 동향, 기술 발전 방향 포함)"
}

중요 요청사항:
1. 각 회사의 매출규모, 시장점유율, 직원수 등 정량적 데이터를 최대한 포함
2. 각 제품의 출시일은 YYYY-MM 형식으로 정확히 기재 (알고 있는 경우)
3. 제품 가격, 판매량, 시장 반응 등 상세 정보 포함
4. 경쟁사 대비 기술적 우위/열위 분석 포함
5. 시장 트렌드와 향후 전망 포함
6. 제품 타입별 스펙 정보 필수 포함:
   [로봇 제품 - formFactor]
   - arms: 팔 개수 (0, 1, 2)
   - hands: 핸드 타입 (none/gripper/3finger/5finger)
   - mobility: 이동 방식 (fixed/wheel/track/quadruped/biped)
   - heightCm: 로봇 높이 (cm 숫자)
   - payloadKg: 페이로드 (kg 숫자)
   
   [SoC/칩 제품 - specs]
   - tops: AI 연산 성능 (TOPS 숫자)
   - npuTops: NPU 전용 TOPS
   - process: 제조 공정 (예: 7nm, TSMC N5)
   - tdpWatts: 전력 소비 (예: 15-60W)
   - memory: 메모리 타입 (HBM2, LPDDR5 등)
   - memoryBandwidth: 메모리 대역폭 (예: 1.2 TB/s)
   - cpuCores, gpuCores: CPU/GPU 코어 구성
   
   [액츄에이터 - specs]
   - torqueNm: 토크 (Nm)
   - rpmMax: 최대 RPM

JSON만 출력. 마크다운 코드블록 없이 순수 JSON으로.`;
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(generatePrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addProductType = () => {
    if (newProductType && !productTypes.includes(newProductType.toLowerCase())) {
      const updated = [...productTypes, newProductType.toLowerCase()];
      setProductTypes(updated);
      saveCategories(updated, companyCategories, countries);
      setNewProductType('');
    }
  };

  const removeProductType = (type: string) => {
    const updated = productTypes.filter(t => t !== type);
    setProductTypes(updated);
    saveCategories(updated, companyCategories, countries);
  };

  const addCompanyCategory = () => {
    if (newCompanyCategory && !companyCategories.includes(newCompanyCategory.toLowerCase())) {
      const updated = [...companyCategories, newCompanyCategory.toLowerCase()];
      setCompanyCategories(updated);
      saveCategories(productTypes, updated, countries);
      setNewCompanyCategory('');
    }
  };

  const removeCompanyCategory = (cat: string) => {
    const updated = companyCategories.filter(c => c !== cat);
    setCompanyCategories(updated);
    saveCategories(productTypes, updated, countries);
  };

  const addCountry = () => {
    if (newCountry && !countries.includes(newCountry)) {
      const updated = [...countries, newCountry];
      setCountries(updated);
      saveCategories(productTypes, companyCategories, updated);
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    const updated = countries.filter(c => c !== country);
    setCountries(updated);
    saveCategories(productTypes, companyCategories, updated);
  };

  const resetToDefaults = () => {
    setProductTypes(DEFAULT_PRODUCT_TYPES);
    setCompanyCategories(DEFAULT_COMPANY_CATEGORIES);
    setCountries(DEFAULT_COUNTRIES);
    saveCategories(DEFAULT_PRODUCT_TYPES, DEFAULT_COMPANY_CATEGORIES, DEFAULT_COUNTRIES);
  };

  // 스펙 텍스트 직접 파싱 함수
  const parseSpecText = (specText: string): AnalyzedData => {
    const lines = specText.split(/[•\n]/).filter(line => line.trim());
    const companies: AnalyzedData['companies'] = [];
    const products: AnalyzedData['products'] = [];
    const companySet = new Set<string>();
    
    // 카테고리 감지
    let currentCategory = 'soc';
    const categoryKeywords: Record<string, string> = {
      '임베디드': 'soc',
      '엣지': 'soc',
      '모바일': 'soc',
      '스마트폰': 'soc',
      'PC': 'soc',
      '노트북': 'soc',
      '데이터센터': 'soc',
      'TPU': 'soc',
      'GPU': 'soc',
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 카테고리 헤더 감지
      for (const [keyword, category] of Object.entries(categoryKeywords)) {
        if (trimmed.includes(keyword)) {
          currentCategory = category;
          break;
        }
      }
      
      // "회사 / 제품명 – 스펙" 패턴 파싱
      // 패턴: "NVIDIA Jetson / Jetson Orin Nano, Orin NX – 최대 약 100 TOPS..."
      const match = trimmed.match(/^([^/]+)\s*\/\s*([^–-]+)\s*[–-]\s*(.+)$/);
      if (match) {
        const companyName = match[1].trim();
        const productName = match[2].trim();
        const specPart = match[3].trim();
        
        // 회사 추가
        if (!companySet.has(companyName)) {
          companySet.add(companyName);
          companies.push({
            name: companyName,
            country: guessCountry(companyName),
            category: 'semiconductor',
            description: `${companyName} - AI/반도체 기업`,
          });
        }
        
        // 스펙 파싱
        const specs: DynamicSpecs = {};
        
        // TOPS 추출 (다양한 패턴)
        const topsMatch = specPart.match(/(\d+(?:\.\d+)?)\s*TOPS/i);
        if (topsMatch) {
          specs.tops = parseFloat(topsMatch[1]);
        }
        
        // NPU TOPS 추출
        const npuMatch = specPart.match(/NPU\s*(\d+(?:\.\d+)?)\s*TOPS/i);
        if (npuMatch) {
          specs.npuTops = parseFloat(npuMatch[1]);
        }
        
        // 공정 추출 (nm, TSMC N5 등)
        const processMatch = specPart.match(/(\d+\s*nm|TSMC\s*N\d+[A-Z]*|Intel\s*\d+)/i);
        if (processMatch) {
          specs.process = processMatch[1].trim();
        }
        
        // 전력 소비 추출
        const tdpMatch = specPart.match(/(\d+(?:~|–|-)\d+\s*W|\d+\s*W)/i);
        if (tdpMatch) {
          specs.tdpWatts = tdpMatch[1].trim();
        }
        
        // 메모리 타입 추출
        const memoryMatch = specPart.match(/(HBM\d*[E]?|LPDDR\d+[X]?|DDR\d+)/i);
        if (memoryMatch) {
          specs.memory = memoryMatch[1].toUpperCase();
        }
        
        // 메모리 대역폭 추출
        const bandwidthMatch = specPart.match(/(\d+(?:\.\d+)?\s*(?:TB|GB)\/s)/i);
        if (bandwidthMatch) {
          specs.memoryBandwidth = bandwidthMatch[1].trim();
        }
        
        // 메모리 용량 추출
        const memorySizeMatch = specPart.match(/(\d+\s*GB)\s*(?:HBM|메모리)/i);
        if (memorySizeMatch) {
          specs.memorySize = memorySizeMatch[1].trim();
        }
        
        // CPU 코어 추출
        const cpuMatch = specPart.match(/(\d+[-‑]?core\s*(?:Arm\s*)?CPU|\d+[-‑]core\s*CPU|Cortex[-‑][A-Z]\d+)/i);
        if (cpuMatch) {
          specs.cpuCores = cpuMatch[1].trim();
        }
        
        // GPU 코어/모델 추출
        const gpuMatch = specPart.match(/(\d+[-‑]?core\s*(?:Ampere\s*)?GPU|Adreno\s*\d+[A-Z]*|Radeon\s*\d+[A-Z]*|Xe[-‑]?\d*[-‑]?[A-Z]*\s*GPU)/i);
        if (gpuMatch) {
          specs.gpuModel = gpuMatch[1].trim();
        }
        
        products.push({
          name: productName,
          companyName: companyName,
          type: currentCategory,
          description: specPart,
          specs: Object.keys(specs).length > 0 ? specs : undefined,
        });
      }
    }
    
    return {
      companies,
      products,
      articles: [],
      keywords: extractKeywords(specText),
      summary: `${products.length}개의 제품과 ${companies.length}개의 회사 정보가 파싱되었습니다.`,
    };
  };
  
  // 회사명으로 국가 추정
  const guessCountry = (companyName: string): string => {
    const countryMap: Record<string, string> = {
      'NVIDIA': 'USA',
      'Google': 'USA',
      'Apple': 'USA',
      'Qualcomm': 'USA',
      'AMD': 'USA',
      'Intel': 'USA',
      'Microsoft': 'USA',
      'Amazon': 'USA',
      'Sony': 'Japan',
      'Renesas': 'Japan',
      'MediaTek': 'Taiwan',
      'Rockchip': 'China',
      'NXP': 'Netherlands',
    };
    
    for (const [key, country] of Object.entries(countryMap)) {
      if (companyName.toLowerCase().includes(key.toLowerCase())) {
        return country;
      }
    }
    return 'USA';
  };
  
  // 키워드 추출
  const extractKeywords = (text: string): string[] => {
    const keywords = new Set<string>();
    const keywordPatterns = [
      'TOPS', 'NPU', 'GPU', 'CPU', 'TPU', 'HBM', 'LPDDR', 'DDR',
      'AI', '딥러닝', '추론', '학습', '엣지', '임베디드', '데이터센터',
      'Ampere', 'Blackwell', 'Tensor', 'Neural Engine',
    ];
    
    for (const pattern of keywordPatterns) {
      if (text.includes(pattern)) {
        keywords.add(pattern);
      }
    }
    
    return Array.from(keywords).slice(0, 15);
  };

  // 스펙 텍스트 파싱 및 저장
  const handleParseAndSave = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveResult(null);

    try {
      // 텍스트 파싱
      const parsed = parseSpecText(text);
      setAnalyzed(parsed);
      
      if (parsed.products.length === 0) {
        setError('파싱된 제품이 없습니다. "회사 / 제품명 – 스펙" 형식인지 확인해주세요.');
        setIsSaving(false);
        return;
      }
      
      // JSON으로 변환하여 저장
      const result = await api.analyzeAndSave(JSON.stringify(parsed));
      setSaveResult(result.saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // 스펙 텍스트 미리보기
  const handleParsePreview = () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }

    setError(null);
    setSaveResult(null);
    
    try {
      const parsed = parseSpecText(text);
      setAnalyzed(parsed);
      
      if (parsed.products.length === 0) {
        setError('파싱된 제품이 없습니다. "회사 / 제품명 – 스펙" 형식인지 확인해주세요.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePreview = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalyzed(null);
    setSaveResult(null);

    try {
      const result = await api.analyzeTextPreview(text);
      setAnalyzed(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await api.analyzeAndSave(text);
      setAnalyzed(result.analyzed);
      setSaveResult(result.saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalExtracted = analyzed
    ? analyzed.companies.length + analyzed.products.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">데이터 수집</h1>
        <p className="text-gray-500">AI를 활용하여 로봇 산업 데이터를 수집하고 분석합니다.</p>
      </div>

      {/* 자동 AI 질의 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowAutoQuery(!showAutoQuery)}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-green-700">자동 AI 질의</h3>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
              GPT-4o 직접 질의
            </span>
          </div>
          {showAutoQuery ? (
            <ChevronUp className="w-5 h-5 text-green-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-green-500" />
          )}
        </div>
        
        {showAutoQuery && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-green-600">
              버튼 클릭 한 번으로 GPT-4o에 직접 질의하여 로봇 산업 데이터를 자동으로 수집합니다.
            </p>
            
            {/* 전체 수집 버튼 */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkCollect}
                disabled={isAutoQuerying || isBulkCollecting || autoQueryTopics.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBulkCollecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <PlayCircle className="w-5 h-5" />
                )}
                전체 수집 ({autoQueryTopics.length}개 카테고리)
              </button>
              {isBulkCollecting && (
                <span className="text-sm text-green-700">
                  {bulkProgress.current}/{bulkProgress.total} - {bulkProgress.currentTopic} 수집 중...
                </span>
              )}
            </div>
            
            {/* 전체 수집 결과 */}
            {bulkResult && (
              <div className="p-4 bg-green-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">전체 수집 완료!</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm mb-2">
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-green-600">{bulkResult.total.companiesSaved}</p>
                    <p className="text-xs text-gray-500">회사</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-green-600">{bulkResult.total.productsSaved}</p>
                    <p className="text-xs text-gray-500">제품</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-green-600">{bulkResult.total.articlesSaved}</p>
                    <p className="text-xs text-gray-500">기사</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-green-600">{bulkResult.total.keywordsSaved || 0}</p>
                    <p className="text-xs text-gray-500">키워드</p>
                  </div>
                </div>
                <p className="text-xs text-green-600">
                  완료된 카테고리: {bulkResult.topics.join(', ')}
                </p>
                {bulkResult.total.errors.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    오류 {bulkResult.total.errors.length}건 발생
                  </p>
                )}
              </div>
            )}
            
            {isAutoQuerying && !isBulkCollecting && (
              <div className="p-4 bg-green-100 rounded-lg text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-green-600" />
                <p className="text-sm text-green-700">GPT-4o에 질의 중... (10-30초 소요)</p>
              </div>
            )}
            
            {/* 개별 카테고리 버튼 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {autoQueryTopics.map((topic) => (
                <div key={topic.id} className="relative group">
                  <button
                    onClick={async () => {
                      setSelectedTopic(topic.id);
                      setIsAutoQuerying(true);
                      setError(null);
                      setSaveResult(null);
                      setBulkResult(null);
                      try {
                        console.log('[AutoQuery] Starting query for:', topic.id);
                        const result = await api.autoQuery(topic.id, topic.query);
                        console.log('[AutoQuery] Result:', result);
                        if (result) {
                          setText(JSON.stringify(result, null, 2));
                          setAnalyzed(result);
                        } else {
                          setError('AI 응답이 비어있습니다. 다시 시도해주세요.');
                        }
                      } catch (err) {
                        console.error('[AutoQuery] Error:', err);
                        setError(`AI 질의 실패: ${(err as Error).message}`);
                      } finally {
                        setIsAutoQuerying(false);
                        setSelectedTopic(null);
                      }
                    }}
                    disabled={isAutoQuerying || isBulkCollecting}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedTopic === topic.id
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-green-700 border border-green-200 hover:bg-green-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isAutoQuerying && selectedTopic === topic.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {topic.label}
                  </button>
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAutoQueryTopic(topic.id);
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="카테고리 삭제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* 새 카테고리 추가 */}
            <div className="flex gap-2 pt-2 border-t border-green-200">
              <input
                type="text"
                value={newAutoQueryLabel}
                onChange={(e) => setNewAutoQueryLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAutoQueryTopic()}
                placeholder="새 수집 카테고리 추가 (예: 드론, 의료로봇)..."
                className="flex-1 px-3 py-2 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={addAutoQueryTopic}
                disabled={!newAutoQueryLabel.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            </div>
            
            <div className="text-xs text-green-500">
              💡 개별 버튼: JSON 생성 후 미리보기 | 전체 수집: 모든 카테고리 순차 수집 후 DB 저장
            </div>
          </div>
        )}
      </div>      {/* AI 질의문 템플릿 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowPrompt(!showPrompt)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-medium text-purple-700">AI 질의문 템플릿</h3>
            {categoryUpdated && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs animate-pulse">
                ✓ 업데이트됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyPrompt();
              }}
              className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
            >
              <Copy className="w-4 h-4" />
              {copied ? '복사됨!' : '복사'}
            </button>
            {showPrompt ? (
              <ChevronUp className="w-5 h-5 text-purple-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-500" />
            )}
          </div>
        </div>
        
        {showPrompt && (
          <div className="mt-4">
            <p className="text-sm text-purple-600 mb-2">
              이 질의문을 ChatGPT, Claude 등에 복사하여 사용하세요. 수집한 정보를 붙여넣으면 JSON 형식으로 정리해줍니다.
            </p>
            <pre className="w-full p-3 border border-purple-200 rounded-lg bg-white text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {generatePrompt()}
            </pre>
          </div>
        )}
      </div>

      {/* 카테고리 설정 */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer border-b"
          onClick={() => setShowSettings(!showSettings)}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">카테고리 설정</h3>
            <span className="text-xs text-gray-400">
              (제품 타입 {productTypes.length}개, 회사 카테고리 {companyCategories.length}개, 국가 {countries.length}개)
            </span>
          </div>
          {showSettings ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {showSettings && (
          <div className="p-4 space-y-6">
            {/* 제품 타입 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품 타입 (type)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {productTypes.map((type) => (
                  <span
                    key={type}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {type}
                    <button
                      onClick={() => removeProductType(type)}
                      className="hover:text-green-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProductType}
                  onChange={(e) => setNewProductType(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addProductType()}
                  placeholder="새 제품 타입 추가..."
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={addProductType}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
            </div>

            {/* 회사 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사 카테고리 (category)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {companyCategories.map((cat) => (
                  <span
                    key={cat}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {cat}
                    <button
                      onClick={() => removeCompanyCategory(cat)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCompanyCategory}
                  onChange={(e) => setNewCompanyCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCompanyCategory()}
                  placeholder="새 회사 카테고리 추가..."
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addCompanyCategory}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
            </div>

            {/* 국가 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                국가 (country)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {countries.map((country) => (
                  <span
                    key={country}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {country}
                    <button
                      onClick={() => removeCountry(country)}
                      className="hover:text-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCountry()}
                  placeholder="새 국가 추가..."
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                <button
                  onClick={addCountry}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={resetToDefaults}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                기본값으로 초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 사용 방법 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-3">📋 데이터 수집 방법</h4>
        <ol className="list-decimal list-inside text-blue-700 space-y-2 text-sm">
          <li>위의 <strong>"AI 질의문 템플릿"</strong>을 복사합니다.</li>
          <li>ChatGPT, Claude 등 AI 서비스에 질의문을 붙여넣고, 수집할 정보(뉴스, 보고서 등)를 함께 입력합니다.</li>
          <li>AI가 생성한 JSON 결과를 아래 입력창에 붙여넣습니다.</li>
          <li><strong>"분석 및 저장"</strong> 버튼을 클릭하면 데이터가 DB에 저장됩니다.</li>
        </ol>
      </div>

      {/* 입력 영역 */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          분석할 텍스트 또는 JSON 입력
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`AI가 생성한 JSON을 붙여넣거나, 스펙 텍스트를 직접 입력하세요.

예시 1 (JSON):
{
  "companies": [{ "name": "Tesla", "country": "USA", "category": "robotics" }],
  "products": [{ "name": "Optimus", "companyName": "Tesla", "type": "humanoid" }]
}

예시 2 (스펙 텍스트 - 직접 파싱 가능):
• NVIDIA Jetson / Jetson AGX Orin – 최대 275 TOPS – 12-core Arm CPU, 2048-core Ampere GPU
• Apple / A17 Pro – 35 TOPS – TSMC N3B, 16-core Neural Engine
• Google TPU / TPUv5p – 459 TOPS – HBM 2.76 TB/s, 95 GB HBM`}
          className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm font-mono"
        />
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            {text.length.toLocaleString()} 자
          </span>
          <div className="flex gap-2 flex-wrap">
            {/* 스펙 텍스트 직접 파싱 버튼 */}
            <button
              onClick={handleParsePreview}
              disabled={isAnalyzing || isSaving || !text.trim()}
              className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              title="회사/제품–스펙 형식 텍스트를 직접 파싱"
            >
              <Eye className="w-4 h-4" />
              스펙 파싱 미리보기
            </button>
            <button
              onClick={handleParseAndSave}
              disabled={isAnalyzing || isSaving || !text.trim()}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              title="회사/제품–스펙 형식 텍스트를 파싱하여 저장"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              스펙 파싱 저장
            </button>
            <div className="w-px bg-gray-300 mx-1" />
            {/* 기존 JSON 분석 버튼 */}
            <button
              onClick={handlePreview}
              disabled={isAnalyzing || isSaving || !text.trim()}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              JSON 미리보기
            </button>
            <button
              onClick={handleAnalyzeAndSave}
              disabled={isAnalyzing || isSaving || !text.trim()}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              JSON 분석 저장
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          💡 스펙 텍스트: "회사 / 제품명 – 스펙" 형식 | JSON: AI가 생성한 구조화된 데이터
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 저장 결과 */}
      {saveResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-700">저장 완료</span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.companiesSaved}</p>
              <p className="text-gray-500">회사</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.productsSaved}</p>
              <p className="text-gray-500">제품</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.articlesSaved}</p>
              <p className="text-gray-500">기사</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.keywordsSaved || 0}</p>
              <p className="text-gray-500">키워드</p>
            </div>
          </div>
          {saveResult.errors.length > 0 && (
            <div className="mt-3 text-sm text-orange-600">
              <p className="font-medium">일부 항목 저장 실패:</p>
              <ul className="list-disc list-inside">
                {saveResult.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 분석 결과 */}
      {analyzed && (
        <div className="space-y-4">
          {/* 요약 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-700 mb-2">AI 요약</h3>
            <p className="text-gray-700">{analyzed.summary || '요약 없음'}</p>
            <div className="mt-3 flex items-center gap-4 text-sm text-blue-600">
              <span>총 {totalExtracted}개 항목 추출</span>
            </div>
          </div>

          {/* 키워드 */}
          {analyzed.keywords.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-purple-500" />
                <h3 className="font-medium">추출된 키워드</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {analyzed.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 회사 */}
          {analyzed.companies.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium">추출된 회사 ({analyzed.companies.length})</h3>
              </div>
              <div className="space-y-2">
                {analyzed.companies.map((company, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{company.name}</span>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {company.country}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                          {company.category}
                        </span>
                      </div>
                    </div>
                    {company.description && (
                      <p className="text-sm text-gray-500 mt-1">{company.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 제품 */}
          {analyzed.products.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-green-500" />
                <h3 className="font-medium">추출된 제품 ({analyzed.products.length})</h3>
              </div>
              <div className="space-y-2">
                {analyzed.products.map((product, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{product.name}</span>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          {product.type}
                        </span>
                        {product.releaseDate && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                            {product.releaseDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{product.companyName}</p>
                    {product.description && (
                      <p className="text-sm text-gray-400 mt-1">{product.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
