import Foundation

/// 한 연금의 "나이별 오늘 돈 월액" 결과. 물가연동이므로 수령 구간 안에서는 값이 일정하다.
public struct PensionStream: Equatable {
    public var included: Bool
    public var startAge: Int
    /// 이 나이부터는 지급 안 함(미포함 끝 나이)
    public var endAgeExclusive: Int
    /// 오늘 돈 가치 월액(원). 명목 고정액(주택연금)은 수령 시작 나이 기준 값
    public var realMonthly: Double
    /// 수령 시작 시점 명목 첫 월액(참고 표시용)
    public var nominalFirstMonthly: Double
    /// 은퇴(적립 종료) 시점 적립금(명목). 해당 없으면 0
    public var balanceAtEnd: Double
    /// 수령 시작 시점 적립금(명목). 해당 없으면 0
    public var balanceAtStart: Double
    public var effectiveYears: Int
    /// true 이면 명목 고정액(주택연금): 나이 a의 오늘 돈 월액 = nominalFirstMonthly / D(a)
    public var isNominalFixed: Bool
    public var currentAge: Int
    public var inflation: Double
    public var errors: [String]
    public var warnings: [String]

    public init(included: Bool = false,
                startAge: Int = 0,
                endAgeExclusive: Int = 0,
                realMonthly: Double = 0,
                nominalFirstMonthly: Double = 0,
                balanceAtEnd: Double = 0,
                balanceAtStart: Double = 0,
                effectiveYears: Int = 0,
                isNominalFixed: Bool = false,
                currentAge: Int = 0,
                inflation: Double = 0,
                errors: [String] = [],
                warnings: [String] = []) {
        self.included = included
        self.startAge = startAge
        self.endAgeExclusive = endAgeExclusive
        self.realMonthly = realMonthly
        self.nominalFirstMonthly = nominalFirstMonthly
        self.balanceAtEnd = balanceAtEnd
        self.balanceAtStart = balanceAtStart
        self.effectiveYears = effectiveYears
        self.isNominalFixed = isNominalFixed
        self.currentAge = currentAge
        self.inflation = inflation
        self.errors = errors
        self.warnings = warnings
    }

    public static func off() -> PensionStream {
        return PensionStream()
    }

    public var hasErrors: Bool {
        return !errors.isEmpty
    }

    public func amount(atAge age: Int) -> Double {
        if !included || hasErrors { return 0 }
        if !realMonthly.isFinite { return 0 }
        if age >= startAge && age < endAgeExclusive {
            if isNominalFixed {
                return nominalFirstMonthly / Finance.discountFactor(age: age, currentAge: currentAge, inflation: inflation)
            }
            return realMonthly
        }
        return 0
    }

    /// 계산 마무리: NaN/무한대면 오류로 바꾸고 0으로 만든다.
    mutating func finalizeFiniteCheck() {
        if !realMonthly.isFinite || !nominalFirstMonthly.isFinite || !balanceAtStart.isFinite || !balanceAtEnd.isFinite {
            errors.append(MoneyFormat.notComputable + ": 입력값을 확인해 주세요.")
            realMonthly = 0
            nominalFirstMonthly = 0
            balanceAtStart = 0
            balanceAtEnd = 0
        }
    }
}
