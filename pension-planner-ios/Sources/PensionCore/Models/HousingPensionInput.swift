import Foundation

public enum HousingInputMode: String, Codable, Equatable {
    /// 공사 조회값(가입 시점 명목 첫 월지급액) 직접 입력
    case direct
    /// 대략 추정(가격표 사용)
    case estimate
}

/// 가격표 한 줄: 가입 나이 -> 주택가격 1억원당 월지급금(원). 사용자가 직접 입력한다.
public struct HousingPriceRow: Codable, Equatable, Identifiable {
    public var id: UUID
    public var age: Int
    public var monthlyPer100M: Double

    public init(id: UUID = UUID(), age: Int = 60, monthlyPer100M: Double = 0) {
        self.id = id
        self.age = age
        self.monthlyPer100M = monthlyPer100M
    }

    private enum CodingKeys: String, CodingKey {
        case id, age, monthlyPer100M
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        self.age = try c.decodeIfPresent(Int.self, forKey: .age) ?? 60
        self.monthlyPer100M = try c.decodeIfPresent(Double.self, forKey: .monthlyPer100M) ?? 0
    }
}

/// 주택연금 가격표. 기본값은 전부 비어 있다(실제 지급액 표를 앱에 넣지 않는다).
public struct HousingPriceTable: Codable, Equatable {
    public var rows: [HousingPriceRow]
    /// 주택가격 상한(원). 0 = 미입력(상한 적용 안 함)
    public var priceCap: Double
    public var source: String
    public var asOfDate: String
    /// 신뢰도 A~F
    public var confidence: String

    public static let unknownText = "확인할 수 없음"

    public init(rows: [HousingPriceRow] = [],
                priceCap: Double = 0,
                source: String = HousingPriceTable.unknownText,
                asOfDate: String = HousingPriceTable.unknownText,
                confidence: String = "F") {
        self.rows = rows
        self.priceCap = priceCap
        self.source = source
        self.asOfDate = asOfDate
        self.confidence = confidence
    }

    private enum CodingKeys: String, CodingKey {
        case rows, priceCap, source, asOfDate, confidence
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.rows = try c.decodeIfPresent([HousingPriceRow].self, forKey: .rows) ?? []
        self.priceCap = try c.decodeIfPresent(Double.self, forKey: .priceCap) ?? 0
        self.source = try c.decodeIfPresent(String.self, forKey: .source) ?? HousingPriceTable.unknownText
        self.asOfDate = try c.decodeIfPresent(String.self, forKey: .asOfDate) ?? HousingPriceTable.unknownText
        self.confidence = try c.decodeIfPresent(String.self, forKey: .confidence) ?? "F"
    }

    /// 보간 없이 정확히 같은 나이의 값만 돌려준다. 없거나 0 이하이면 nil.
    public func monthlyPer100M(forAge age: Int) -> Double? {
        for row in rows {
            if row.age == age && row.monthlyPer100M > 0 {
                return row.monthlyPer100M
            }
        }
        return nil
    }
}

public struct HousingPensionInput: Codable, Equatable {
    public var included: Bool
    public var mode: HousingInputMode
    public var joinSameAsRetirement: Bool
    public var joinAge: Int
    /// (a) 가입 시점 명목 첫 월지급액(원). 0 = 미입력
    public var directMonthlyPayment: Double
    /// (b) 현재 주택가격(원)
    public var currentHomePrice: Double
    public var homePriceGrowthRate: Double
    public var priceTable: HousingPriceTable

    public init(included: Bool = false,
                mode: HousingInputMode = .direct,
                joinSameAsRetirement: Bool = true,
                joinAge: Int = 60,
                directMonthlyPayment: Double = 0,
                currentHomePrice: Double = 0,
                homePriceGrowthRate: Double = 0,
                priceTable: HousingPriceTable = HousingPriceTable()) {
        self.included = included
        self.mode = mode
        self.joinSameAsRetirement = joinSameAsRetirement
        self.joinAge = joinAge
        self.directMonthlyPayment = directMonthlyPayment
        self.currentHomePrice = currentHomePrice
        self.homePriceGrowthRate = homePriceGrowthRate
        self.priceTable = priceTable
    }

    private enum CodingKeys: String, CodingKey {
        case included, mode, joinSameAsRetirement, joinAge, directMonthlyPayment
        case currentHomePrice, homePriceGrowthRate, priceTable
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.included = try c.decodeIfPresent(Bool.self, forKey: .included) ?? false
        self.mode = try c.decodeIfPresent(HousingInputMode.self, forKey: .mode) ?? .direct
        self.joinSameAsRetirement = try c.decodeIfPresent(Bool.self, forKey: .joinSameAsRetirement) ?? true
        self.joinAge = try c.decodeIfPresent(Int.self, forKey: .joinAge) ?? 60
        self.directMonthlyPayment = try c.decodeIfPresent(Double.self, forKey: .directMonthlyPayment) ?? 0
        self.currentHomePrice = try c.decodeIfPresent(Double.self, forKey: .currentHomePrice) ?? 0
        self.homePriceGrowthRate = try c.decodeIfPresent(Double.self, forKey: .homePriceGrowthRate) ?? 0
        self.priceTable = try c.decodeIfPresent(HousingPriceTable.self, forKey: .priceTable) ?? HousingPriceTable()
    }
}
