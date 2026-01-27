import re
from typing import TypedDict


class LanguageDetectionResult(TypedDict):
    language: str
    confidence: float


class LanguageDetector:
    """Simple language detector for Korean and English"""
    
    # Korean Unicode ranges
    KOREAN_PATTERN = re.compile(r'[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]')
    
    def detect(self, text: str) -> LanguageDetectionResult:
        """
        Detect if text is primarily Korean or English.
        Returns language code ('ko' or 'en') and confidence score.
        """
        if not text or not text.strip():
            return {"language": "en", "confidence": 0.5}
        
        # Count Korean characters
        korean_chars = len(self.KOREAN_PATTERN.findall(text))
        total_chars = len(re.findall(r'\S', text))  # Non-whitespace chars
        
        if total_chars == 0:
            return {"language": "en", "confidence": 0.5}
        
        korean_ratio = korean_chars / total_chars
        
        if korean_ratio > 0.3:
            return {"language": "ko", "confidence": min(0.5 + korean_ratio, 1.0)}
        else:
            return {"language": "en", "confidence": min(0.5 + (1 - korean_ratio), 1.0)}
