import Foundation

public struct NationalPensionInput: Codable, Equatable {
    public var included: Bool
    /// 월 예상 수령액(오늘 돈 가치, 원). 0 = 미입력
    public var monthlyAmount: Double
    public var startAge: Int

    public init(included: Bool = true, monthlyAmount: Double = 0, startAge: Int = 65) {
        self.included = included
        self.monthlyAmount = monthlyAmount
        self.startAge = startAge
    }

    private enum CodingKeys: String, CodingKey {
        case included, monthlyAmount, startAge
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.included = try c.decodeIfPresent(Bool.self, forKey: .included) ?? true
        self.monthlyAmount = try c.decodeIfPresent(Double.self, forKey: .monthlyAmount) ?? 0
        self.startAge = try c.decodeIfPresent(Int.self, forKey: .startAge) ?? 65
    }
}
