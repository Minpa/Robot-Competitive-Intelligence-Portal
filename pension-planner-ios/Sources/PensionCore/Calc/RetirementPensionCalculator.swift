import Foundation

public enum RetirementPensionCalculator {

    public static func effectiveStartAge(_ input: RetirementPensionInput, _ common: CommonAssumptions) -> Int {
        return input.startSameAsRetirement ? common.retirementAge : input.startAge
    }

    /// 은퇴 시점 적립금(명목)
    public static func balanceAtRetirement(input: RetirementPensionInput, common: CommonAssumptions) -> Double {
        if input.mode == .direct {
            return input.directBalanceAtRetirement
        }
        let months = 12 * max(0, common.retirementAge - common.currentAge)
        let i = input.accumulationReturn / 12.0
        var balance = input.currentBalance
        var m = 0
        while m < months {
            let yearIndex = m / 12
            let salary = input.annualSalary * pow(1.0 + input.salaryGrowthRate, Double(yearIndex))
            balance = balance * (1.0 + i) + salary * input.contributionRate / 12.0
            m += 1
        }
        return balance
    }

    public static func calculate(input: RetirementPensionInput, common: CommonAssumptions) -> PensionStream {
        var stream = PensionStream.off()
        if !input.included { return stream }
        stream.included = true
        if !Validation.commonErrors(common).isEmpty { return stream }

        let start = effectiveStartAge(input, common)
        stream.startAge = start

        var errors: [String] = []
        if start < common.retirementAge {
            errors.append("퇴직연금 수령 시작 나이는 은퇴 나이보다 빠를 수 없어요.")
        }
        if input.payoutYears < 1 {
            errors.append("퇴직연금 수령 기간은 1년 이상이어야 해요.")
        }
        if let e = Validation.rateError("퇴직연금 적립 수익률", input.accumulationReturn) { errors.append(e) }
        if let e = Validation.rateError("퇴직연금 수령 중 수익률", input.payoutReturn) { errors.append(e) }
        if input.mode == .calculate {
            if let e = Validation.amountError("퇴직연금 현재 적립금", input.currentBalance) { errors.append(e) }
            if let e = Validation.amountError("연봉", input.annualSalary) { errors.append(e) }
            if let e = Validation.rateError("연봉 상승률", input.salaryGrowthRate) { errors.append(e) }
            if !input.contributionRate.isFinite || input.contributionRate < 0 || input.contributionRate > 1 {
                errors.append("연간 적립률은 0%에서 100% 사이로 입력해 주세요.")
            }
        } else {
            if let e = Validation.amountError("은퇴 시점 적립금", input.directBalanceAtRetirement) { errors.append(e) }
        }
        if !errors.isEmpty {
            stream.errors = errors
            return stream
        }

        let bRet = balanceAtRetirement(input: input, common: common)
        let growMonths = 12 * max(0, start - common.retirementAge)
        let bStart = Finance.fv(bRet, input.accumulationReturn / 12.0, growMonths)
        let payout = Finance.realMonthlyPayout(balanceAtStart: bStart,
                                               startAge: start,
                                               currentAge: common.currentAge,
                                               inflation: common.inflationRate,
                                               payoutReturn: input.payoutReturn,
                                               payoutYears: input.payoutYears,
                                               lifeExpectancy: common.lifeExpectancy)
        stream.balanceAtEnd = bRet
        stream.balanceAtStart = bStart
        stream.effectiveYears = payout.effectiveYears
        stream.realMonthly = payout.realMonthly
        stream.endAgeExclusive = start + payout.effectiveYears
        let d = Finance.discountFactor(age: start, currentAge: common.currentAge, inflation: common.inflationRate)
        stream.nominalFirstMonthly = payout.realMonthly * d

        if payout.effectiveYears <= 0 {
            stream.warnings.append("퇴직연금 수령 시작 나이가 기대수명 이상이라 월 수령액을 0원으로 봤어요.")
        } else if payout.effectiveYears < input.payoutYears {
            stream.warnings.append("기대수명까지만 받는 것으로 보고 퇴직연금 수령 기간을 \(payout.effectiveYears)년으로 줄였어요.")
        }
        stream.finalizeFiniteCheck()
        return stream
    }
}
