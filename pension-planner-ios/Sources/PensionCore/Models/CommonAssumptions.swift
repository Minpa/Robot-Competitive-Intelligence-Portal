import Foundation

/// 공통 가정. 금액은 원, 비율은 소수(0.02 = 2%).
public struct CommonAssumptions: Codable, Equatable {
    public var currentAge: Int
    public var retirementAge: Int
    public var lifeExpectancy: Int
    public var inflationRate: Double
    public var targetMonthly: Double

    public init(currentAge: Int = 40,
                retirementAge: Int = 60,
                lifeExpectancy: Int = 90,
                inflationRate: Double = 0.02,
                targetMonthly: Double = 5_000_000) {
        self.currentAge = currentAge
        self.retirementAge = retirementAge
        self.lifeExpectancy = lifeExpectancy
        self.inflationRate = inflationRate
        self.targetMonthly = targetMonthly
    }

    private enum CodingKeys: String, CodingKey {
        case currentAge, retirementAge, lifeExpectancy, inflationRate, targetMonthly
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.currentAge = try c.decodeIfPresent(Int.self, forKey: .currentAge) ?? 40
        self.retirementAge = try c.decodeIfPresent(Int.self, forKey: .retirementAge) ?? 60
        self.lifeExpectancy = try c.decodeIfPresent(Int.self, forKey: .lifeExpectancy) ?? 90
        self.inflationRate = try c.decodeIfPresent(Double.self, forKey: .inflationRate) ?? 0.02
        self.targetMonthly = try c.decodeIfPresent(Double.self, forKey: .targetMonthly) ?? 5_000_000
    }
}
