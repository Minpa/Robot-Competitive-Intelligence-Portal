import Foundation

public enum PersonalPensionCalculator {

    public static func effectiveEndAge(_ input: PersonalPensionInput, _ common: CommonAssumptions) -> Int {
        return input.endSameAsRetirement ? common.retirementAge : input.contributionEndAge
    }

    public static func effectiveStartAge(_ input: PersonalPensionInput, _ common: CommonAssumptions) -> Int {
        return input.startSameAsRetirement ? common.retirementAge : input.startAge
    }

    public static func calculate(input: PersonalPensionInput, common: CommonAssumptions) -> PensionStream {
        var stream = PensionStream.off()
        if !input.included { return stream }
        stream.included = true
        if !Validation.commonErrors(common).isEmpty { return stream }

        let end = effectiveEndAge(input, common)
        let start = effectiveStartAge(input, common)
        stream.startAge = start

        var errors: [String] = []
        if start < end {
            errors.append("개인연금 수령 시작 나이는 납입 종료 나이보다 빠를 수 없어요.")
        }
        if start < common.retirementAge {
            errors.append("개인연금 수령 시작 나이는 은퇴 나이보다 빠를 수 없어요.")
        }
        if input.payoutYears < 1 {
            errors.append("개인연금 수령 기간은 1년 이상이어야 해요.")
        }
        if let e = Validation.rateError("개인연금 운용 수익률", input.accumulationReturn) { errors.append(e) }
        if let e = Validation.rateError("개인연금 수령 중 수익률", input.payoutReturn) { errors.append(e) }
        if let e = Validation.amountError("개인연금 현재 잔액", input.currentBalance) { errors.append(e) }
        if let e = Validation.amountError("개인연금 월 납입액", input.monthlyContribution) { errors.append(e) }
        if !errors.isEmpty {
            stream.errors = errors
            return stream
        }

        let i = input.accumulationReturn / 12.0
        let contributionMonths = 12 * max(0, end - common.currentAge)
        let bContrib = Finance.fv(input.currentBalance, i, contributionMonths)
            + Finance.annuityFV(input.monthlyContribution, i, contributionMonths)
        // 납입이 끝난 뒤(또는 이미 끝난 경우 지금부터) 수령 시작까지 운용
        let growFrom = max(end, common.currentAge)
        let bStart = Finance.fv(bContrib, i, 12 * max(0, start - growFrom))
        let payout = Finance.realMonthlyPayout(balanceAtStart: bStart,
                                               startAge: start,
                                               currentAge: common.currentAge,
                                               inflation: common.inflationRate,
                                               payoutReturn: input.payoutReturn,
                                               payoutYears: input.payoutYears,
                                               lifeExpectancy: common.lifeExpectancy)
        stream.balanceAtEnd = bContrib
        stream.balanceAtStart = bStart
        stream.effectiveYears = payout.effectiveYears
        stream.realMonthly = payout.realMonthly
        stream.endAgeExclusive = start + payout.effectiveYears
        let d = Finance.discountFactor(age: start, currentAge: common.currentAge, inflation: common.inflationRate)
        stream.nominalFirstMonthly = payout.realMonthly * d

        // U11: 참고 수준 경고(막지 않음)
        if start < 55 {
            stream.warnings.append("참고: 개인연금은 보통 55세 이후에 받아요. 일반적인 기준이며 최종 확인이 필요해요.")
        }
        if input.payoutYears < 10 {
            stream.warnings.append("참고: 개인연금은 보통 10년 이상 나눠 받아야 해요. 일반적인 기준이며 최종 확인이 필요해요.")
        }
        if payout.effectiveYears <= 0 {
            stream.warnings.append("개인연금 수령 시작 나이가 기대수명 이상이라 월 수령액을 0원으로 봤어요.")
        } else if payout.effectiveYears < input.payoutYears {
            stream.warnings.append("기대수명까지만 받는 것으로 보고 개인연금 수령 기간을 \(payout.effectiveYears)년으로 줄였어요.")
        }
        stream.finalizeFiniteCheck()
        return stream
    }

    /// 월 납입 1원, 잔액 0원일 때의 오늘 돈 월 수령액(p1). 계산 불가면 nil.
    public static func monthlyPayoutPerWonContribution(input: PersonalPensionInput,
                                                       common: CommonAssumptions) -> PensionStream {
        var probe = input
        probe.included = true
        probe.currentBalance = 0
        probe.monthlyContribution = 1
        return calculate(input: probe, common: common)
    }
}
