import re
from typing import Optional
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer


class KeywordExtractor:
    """Extract keywords from text using TF-IDF and simple NER patterns"""
    
    # Common stopwords
    ENGLISH_STOPWORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
        'she', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why',
        'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
        'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
        'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there'
    }
    
    KOREAN_STOPWORDS = {
        '이', '그', '저', '것', '수', '등', '및', '또는', '그리고', '하지만',
        '그러나', '때문', '위해', '통해', '대해', '관해', '따라', '의해',
        '있다', '없다', '하다', '되다', '이다', '아니다', '같다', '다르다'
    }
    
    # Technology-related patterns for categorization
    TECH_PATTERNS = [
        r'\b(AI|ML|robot|sensor|motor|battery|SDK|API|ROS|lidar|camera)\b',
        r'\b(humanoid|quadruped|bipedal|autonomous|navigation)\b',
        r'\b(deep learning|machine learning|computer vision|NLP)\b'
    ]
    
    MARKET_PATTERNS = [
        r'\b(market|industry|commercial|enterprise|consumer)\b',
        r'\b(logistics|warehouse|manufacturing|healthcare|service)\b',
        r'\b(price|cost|revenue|sales|growth)\b'
    ]
    
    def __init__(self):
        self.tfidf_en = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=1
        )
        self.tfidf_ko = TfidfVectorizer(
            max_features=100,
            ngram_range=(1, 2),
            min_df=1
        )
    
    def extract(
        self,
        text: str,
        language: str = "en",
        max_keywords: int = 10
    ) -> list[dict]:
        """
        Extract keywords from text.
        Returns list of {term, score, category} dicts.
        """
        if not text or not text.strip():
            return []
        
        # Preprocess text
        processed = self._preprocess(text, language)
        
        # Extract using TF-IDF
        keywords = self._extract_tfidf(processed, language, max_keywords * 2)
        
        # Add named entities / important terms
        entities = self._extract_entities(text, language)
        
        # Merge and deduplicate
        all_keywords = self._merge_keywords(keywords, entities)
        
        # Categorize and score
        result = []
        for term, score in all_keywords[:max_keywords]:
            category = self._categorize(term)
            result.append({
                "term": term,
                "score": round(score, 4),
                "category": category
            })
        
        return result
    
    def _preprocess(self, text: str, language: str) -> str:
        """Clean and preprocess text"""
        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        # Remove special characters but keep Korean
        if language == "ko":
            text = re.sub(r'[^\w\s\uAC00-\uD7AF]', ' ', text)
        else:
            text = re.sub(r'[^\w\s]', ' ', text)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text.lower() if language == "en" else text
    
    def _extract_tfidf(
        self,
        text: str,
        language: str,
        max_keywords: int
    ) -> list[tuple[str, float]]:
        """Extract keywords using TF-IDF"""
        try:
            vectorizer = self.tfidf_ko if language == "ko" else self.tfidf_en
            
            # Fit and transform
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]
            
            # Get top keywords
            keyword_scores = list(zip(feature_names, scores))
            keyword_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Filter stopwords for Korean
            if language == "ko":
                keyword_scores = [
                    (term, score) for term, score in keyword_scores
                    if term not in self.KOREAN_STOPWORDS and len(term) > 1
                ]
            
            return keyword_scores[:max_keywords]
        except Exception:
            return []
    
    def _extract_entities(self, text: str, language: str) -> list[tuple[str, float]]:
        """Extract named entities and important terms using patterns"""
        entities = []
        
        # Find technology terms
        for pattern in self.TECH_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append((match.lower(), 0.8))
        
        # Find market terms
        for pattern in self.MARKET_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append((match.lower(), 0.7))
        
        # Find capitalized terms (potential proper nouns) for English
        if language == "en":
            caps = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
            for cap in caps:
                if cap.lower() not in self.ENGLISH_STOPWORDS:
                    entities.append((cap.lower(), 0.6))
        
        return entities
    
    def _merge_keywords(
        self,
        tfidf_keywords: list[tuple[str, float]],
        entities: list[tuple[str, float]]
    ) -> list[tuple[str, float]]:
        """Merge and deduplicate keywords"""
        merged = {}
        
        for term, score in tfidf_keywords:
            term_lower = term.lower()
            if term_lower in merged:
                merged[term_lower] = max(merged[term_lower], score)
            else:
                merged[term_lower] = score
        
        for term, score in entities:
            term_lower = term.lower()
            if term_lower in merged:
                merged[term_lower] = max(merged[term_lower], score * 1.2)
            else:
                merged[term_lower] = score
        
        # Sort by score
        sorted_keywords = sorted(merged.items(), key=lambda x: x[1], reverse=True)
        return sorted_keywords
    
    def _categorize(self, term: str) -> Optional[str]:
        """Categorize a keyword"""
        term_lower = term.lower()
        
        # Check technology patterns
        for pattern in self.TECH_PATTERNS:
            if re.search(pattern, term_lower, re.IGNORECASE):
                return "technology"
        
        # Check market patterns
        for pattern in self.MARKET_PATTERNS:
            if re.search(pattern, term_lower, re.IGNORECASE):
                return "market"
        
        return None
