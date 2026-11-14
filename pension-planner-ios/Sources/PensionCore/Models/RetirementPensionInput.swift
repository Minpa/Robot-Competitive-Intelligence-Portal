import Foundation

public enum RetirementInputMode: String, Codable, Equatable {
    /// DC/IRP 적립 계산
    case calculate
    /// 은퇴 시점 적립금(명목) 직접 입력
    case direct
}

public struct RetirementPensionInput: Codable, Equatable {
    public var included: Bool
    public var mode: RetirementInputMode
    public var currentBalance: Double
    public var annualSalary: Double
    public var salaryGrowthRate: Double
    public var contributionRate: Double
    public var accumulationReturn: Double
    public var directBalanceAtRetirement: Double
    public var startSameAsRetirement: Bool
    public var startAge: Int
    public var payoutYears: Int
    public var payoutReturn: Double

    public init(included: Bool = true,
                mode: RetirementInputMode = .calculate,
                currentBalance: Double = 30_000_000,
                annualSalary: Double = 50_000_000,
                salaryGrowthRate: Double = 0.03,
                contributionRate: Double = 1.0 / 12.0,
                accumulationReturn: Double = 0.04,
                directBalanceAtRetirement: Double = 0,
                startSameAsRetirement: Bool = true,
                startAge: Int = 60,
                payoutYears: Int = 20,
                payoutReturn: Double = 0.03) {
        self.included = included
        self.mode = mode
        self.currentBalance = currentBalance
        self.annualSalary = annualSalary
        self.salaryGrowthRate = salaryGrowthRate
        self.contributionRate = contributionRate
        self.accumulationReturn = accumulationReturn
        self.directBalanceAtRetirement = directBalanceAtRetirement
        self.startSameAsRetirement = startSameAsRetirement
        self.startAge = startAge
        self.payoutYears = payoutYears
        self.payoutReturn = payoutReturn
    }

    private enum CodingKeys: String, CodingKey {
        case included, mode, currentBalance, annualSalary, salaryGrowthRate, contributionRate
        case accumulationReturn, directBalanceAtRetirement, startSameAsRetirement, startAge
        case payoutYears, payoutReturn
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.included = try c.decodeIfPresent(Bool.self, forKey: .included) ?? true
        self.mode = try c.decodeIfPresent(RetirementInputMode.self, forKey: .mode) ?? .calculate
        self.currentBalance = try c.decodeIfPresent(Double.self, forKey: .currentBalance) ?? 30_000_000
        self.annualSalary = try c.decodeIfPresent(Double.self, forKey: .annualSalary) ?? 50_000_000
        self.salaryGrowthRate = try c.decodeIfPresent(Double.self, forKey: .salaryGrowthRate) ?? 0.03
        self.contributionRate = try c.decodeIfPresent(Double.self, forKey: .contributionRate) ?? (1.0 / 12.0)
        self.accumulationReturn = try c.decodeIfPresent(Double.self, forKey: .accumulationReturn) ?? 0.04
        self.directBalanceAtRetirement = try c.decodeIfPresent(Double.self, forKey: .directBalanceAtRetirement) ?? 0
        self.startSameAsRetirement = try c.decodeIfPresent(Bool.self, forKey: .startSameAsRetirement) ?? true
        self.startAge = try c.decodeIfPresent(Int.self, forKey: .startAge) ?? 60
        self.payoutYears = try c.decodeIfPresent(Int.self, forKey: .payoutYears) ?? 20
        self.payoutReturn = try c.decodeIfPresent(Double.self, forKey: .payoutReturn) ?? 0.03
    }
}
