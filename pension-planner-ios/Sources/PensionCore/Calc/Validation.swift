import Foundation

public enum Validation {
    /// 수익률·상승률 허용 범위(소수). -10% ~ 30%
    public static let rateMin: Double = -0.10
    public static let rateMax: Double = 0.30

    public static func rateError(_ name: String, _ value: Double) -> String? {
        if !value.isFinite { return "\(name) 값이 올바르지 않아요." }
        if value < rateMin - 1e-12 || value > rateMax + 1e-12 {
            return "\(name)은(는) -10%에서 30% 사이로 입력해 주세요."
        }
        return nil
    }

    public static func amountError(_ name: String, _ value: Double) -> String? {
        if !value.isFinite { return "\(name) 값이 올바르지 않아요." }
        if value < 0 { return "\(name)은(는) 0 이상으로 입력해 주세요." }
        return nil
    }

    public static func commonErrors(_ c: CommonAssumptions) -> [String] {
        var errors: [String] = []
        if c.currentAge < 20 || c.currentAge > 80 {
            errors.append("현재 나이는 20세에서 80세 사이로 입력해 주세요.")
        }
        if c.retirementAge < c.currentAge {
            errors.append("은퇴 나이는 현재 나이보다 어릴 수 없어요.")
        }
        if c.lifeExpectancy <= c.retirementAge {
            errors.append("기대수명은 은퇴 나이보다 커야 해요.")
        }
        if !c.inflationRate.isFinite || c.inflationRate < -0.02 - 1e-12 || c.inflationRate > 0.10 + 1e-12 {
            errors.append("물가상승률은 -2%에서 10% 사이로 입력해 주세요.")
        }
        if !c.targetMonthly.isFinite || c.targetMonthly <= 0 {
            errors.append("목표 월수입은 0보다 커야 해요.")
        }
        return errors
    }

    public static func isFinitePositiveOrZero(_ v: Double) -> Bool {
        return v.isFinite && v >= 0
    }
}
