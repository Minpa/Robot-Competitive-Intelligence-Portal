import Foundation

public enum MoneyFormat {
    public static let notComputable = "계산할 수 없음"

    /// 1,234 형태(세 자리 쉼표)
    public static func groupedInteger(_ value: Int) -> String {
        let negative = value < 0
        let digits = String(abs(value))
        var result = ""
        var count = 0
        for ch in digits.reversed() {
            if count > 0 && count % 3 == 0 {
                result.append(",")
            }
            result.append(ch)
            count += 1
        }
        let body = String(result.reversed())
        return negative ? "-" + body : body
    }

    /// 원 -> 만원 단위 반올림 정수
    public static func manwonValue(_ won: Double) -> Int {
        if !won.isFinite || abs(won) > 1e15 { return 0 }
        return Int((won / 10_000.0).rounded())
    }

    /// 예: 3,125,000 -> "313만원"
    public static func manwon(_ won: Double) -> String {
        if !won.isFinite || abs(won) > 1e15 { return notComputable }
        return groupedInteger(manwonValue(won)) + "만원"
    }

    /// 예: 0.02 -> "2%"  (소수점 이하 필요할 때만 표시)
    public static func percent(_ rate: Double) -> String {
        if !rate.isFinite { return notComputable }
        let value = rate * 100.0
        let rounded = (value * 100.0).rounded() / 100.0
        if rounded == rounded.rounded() {
            return String(Int(rounded)) + "%"
        }
        return String(rounded) + "%"
    }

    /// 나이 범위 문구. 예: "60~64세", 한 해면 "60세"
    public static func ageRange(_ start: Int, _ end: Int) -> String {
        if start == end { return "\(start)세" }
        return "\(start)~\(end)세"
    }
}
