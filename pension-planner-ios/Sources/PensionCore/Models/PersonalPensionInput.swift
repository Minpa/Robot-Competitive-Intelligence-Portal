import Foundation

public struct PersonalPensionInput: Codable, Equatable {
    public var included: Bool
    public var currentBalance: Double
    public var monthlyContribution: Double
    public var endSameAsRetirement: Bool
    public var contributionEndAge: Int
    public var accumulationReturn: Double
    public var startSameAsRetirement: Bool
    public var startAge: Int
    public var payoutYears: Int
    public var payoutReturn: Double

    public init(included: Bool = true,
                currentBalance: Double = 0,
                monthlyContribution: Double = 300_000,
                endSameAsRetirement: Bool = true,
                contributionEndAge: Int = 60,
                accumulationReturn: Double = 0.04,
                startSameAsRetirement: Bool = true,
                startAge: Int = 60,
                payoutYears: Int = 20,
                payoutReturn: Double = 0.03) {
        self.included = included
        self.currentBalance = currentBalance
        self.monthlyContribution = monthlyContribution
        self.endSameAsRetirement = endSameAsRetirement
        self.contributionEndAge = contributionEndAge
        self.accumulationReturn = accumulationReturn
        self.startSameAsRetirement = startSameAsRetirement
        self.startAge = startAge
        self.payoutYears = payoutYears
        self.payoutReturn = payoutReturn
    }

    private enum CodingKeys: String, CodingKey {
        case included, currentBalance, monthlyContribution, endSameAsRetirement, contributionEndAge
        case accumulationReturn, startSameAsRetirement, startAge, payoutYears, payoutReturn
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.included = try c.decodeIfPresent(Bool.self, forKey: .included) ?? true
        self.currentBalance = try c.decodeIfPresent(Double.self, forKey: .currentBalance) ?? 0
        self.monthlyContribution = try c.decodeIfPresent(Double.self, forKey: .monthlyContribution) ?? 300_000
        self.endSameAsRetirement = try c.decodeIfPresent(Bool.self, forKey: .endSameAsRetirement) ?? true
        self.contributionEndAge = try c.decodeIfPresent(Int.self, forKey: .contributionEndAge) ?? 60
        self.accumulationReturn = try c.decodeIfPresent(Double.self, forKey: .accumulationReturn) ?? 0.04
        self.startSameAsRetirement = try c.decodeIfPresent(Bool.self, forKey: .startSameAsRetirement) ?? true
        self.startAge = try c.decodeIfPresent(Int.self, forKey: .startAge) ?? 60
        self.payoutYears = try c.decodeIfPresent(Int.self, forKey: .payoutYears) ?? 20
        self.payoutReturn = try c.decodeIfPresent(Double.self, forKey: .payoutReturn) ?? 0.03
    }
}
