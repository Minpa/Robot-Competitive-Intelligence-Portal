from typing import Optional


class TrendAnalyzer:
    """Analyze keyword trends between time periods"""
    
    def analyze(
        self,
        current_counts: dict[str, int],
        previous_counts: dict[str, int],
        period: str = "week"
    ) -> list[dict]:
        """
        Analyze trends by comparing current and previous period counts.
        
        Returns list of trend objects with:
        - term: keyword
        - count: current period count
        - previous_count: previous period count
        - delta: absolute change
        - delta_percent: percentage change
        """
        trends = []
        
        # Get all unique keywords
        all_keywords = set(current_counts.keys()) | set(previous_counts.keys())
        
        for term in all_keywords:
            current = current_counts.get(term, 0)
            previous = previous_counts.get(term, 0)
            
            delta = current - previous
            
            # Calculate percentage change
            if previous > 0:
                delta_percent = (delta / previous) * 100
            elif current > 0:
                delta_percent = 100.0  # New keyword
            else:
                delta_percent = 0.0
            
            trends.append({
                "term": term,
                "count": current,
                "previous_count": previous,
                "delta": delta,
                "delta_percent": round(delta_percent, 2)
            })
        
        # Sort by absolute delta (most changed first)
        trends.sort(key=lambda x: abs(x["delta"]), reverse=True)
        
        return trends
    
    def get_top_trending(
        self,
        trends: list[dict],
        limit: int = 10,
        min_count: int = 1
    ) -> list[dict]:
        """Get top trending keywords (highest positive delta)"""
        filtered = [t for t in trends if t["count"] >= min_count and t["delta"] > 0]
        filtered.sort(key=lambda x: x["delta_percent"], reverse=True)
        return filtered[:limit]
    
    def get_declining(
        self,
        trends: list[dict],
        limit: int = 10
    ) -> list[dict]:
        """Get declining keywords (highest negative delta)"""
        filtered = [t for t in trends if t["delta"] < 0]
        filtered.sort(key=lambda x: x["delta"])
        return filtered[:limit]
    
    def get_new_keywords(
        self,
        trends: list[dict],
        limit: int = 10
    ) -> list[dict]:
        """Get newly appeared keywords"""
        new = [t for t in trends if t["previous_count"] == 0 and t["count"] > 0]
        new.sort(key=lambda x: x["count"], reverse=True)
        return new[:limit]
    
    def calculate_weekly_stats(
        self,
        keyword_history: dict[str, list[int]]
    ) -> dict[str, dict]:
        """
        Calculate weekly statistics for keywords.
        
        keyword_history: {keyword: [week1_count, week2_count, ...]}
        """
        stats = {}
        
        for term, counts in keyword_history.items():
            if not counts:
                continue
            
            total = sum(counts)
            avg = total / len(counts)
            
            # Calculate trend (simple linear)
            if len(counts) >= 2:
                recent_avg = sum(counts[-2:]) / 2
                older_avg = sum(counts[:-2]) / max(len(counts) - 2, 1)
                trend = "up" if recent_avg > older_avg else "down" if recent_avg < older_avg else "stable"
            else:
                trend = "stable"
            
            stats[term] = {
                "total": total,
                "average": round(avg, 2),
                "max": max(counts),
                "min": min(counts),
                "trend": trend,
                "weeks": len(counts)
            }
        
        return stats
