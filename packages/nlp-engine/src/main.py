from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import os

from services.keyword_extractor import KeywordExtractor
from services.trend_analyzer import TrendAnalyzer
from services.language_detector import LanguageDetector

app = FastAPI(
    title="RCIP NLP Engine",
    description="Keyword extraction and trend analysis for Robot Competitive Intelligence Portal",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
keyword_extractor = KeywordExtractor()
trend_analyzer = TrendAnalyzer()
language_detector = LanguageDetector()


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str = "nlp-engine"


class KeywordExtractionRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: Optional[str] = None
    max_keywords: int = Field(default=10, ge=1, le=50)


class Keyword(BaseModel):
    term: str
    score: float
    category: Optional[str] = None


class KeywordExtractionResponse(BaseModel):
    keywords: list[Keyword]
    language: str
    text_length: int


class TrendAnalysisRequest(BaseModel):
    keyword_counts: dict[str, int]
    previous_counts: Optional[dict[str, int]] = None
    period: str = "week"


class KeywordTrend(BaseModel):
    term: str
    count: int
    previous_count: int
    delta: int
    delta_percent: float


class TrendAnalysisResponse(BaseModel):
    trends: list[KeywordTrend]
    period: str
    total_keywords: int


class LanguageDetectionRequest(BaseModel):
    text: str = Field(..., min_length=1)


class LanguageDetectionResponse(BaseModel):
    language: str
    confidence: float


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat()
    )


@app.post("/extract-keywords", response_model=KeywordExtractionResponse)
async def extract_keywords(request: KeywordExtractionRequest):
    """Extract keywords from text using TF-IDF and NER"""
    try:
        # Detect language if not provided
        language = request.language
        if not language:
            detection = language_detector.detect(request.text)
            language = detection["language"]
        
        # Extract keywords
        keywords = keyword_extractor.extract(
            text=request.text,
            language=language,
            max_keywords=request.max_keywords
        )
        
        return KeywordExtractionResponse(
            keywords=[Keyword(**kw) for kw in keywords],
            language=language,
            text_length=len(request.text)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-trends", response_model=TrendAnalysisResponse)
async def analyze_trends(request: TrendAnalysisRequest):
    """Analyze keyword trends between periods"""
    try:
        trends = trend_analyzer.analyze(
            current_counts=request.keyword_counts,
            previous_counts=request.previous_counts or {},
            period=request.period
        )
        
        return TrendAnalysisResponse(
            trends=[KeywordTrend(**t) for t in trends],
            period=request.period,
            total_keywords=len(trends)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect-language", response_model=LanguageDetectionResponse)
async def detect_language(request: LanguageDetectionRequest):
    """Detect the language of the given text"""
    try:
        result = language_detector.detect(request.text)
        return LanguageDetectionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("NLP_PORT", "3002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
