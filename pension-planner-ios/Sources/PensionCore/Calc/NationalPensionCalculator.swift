import Foundation

public enum NationalPensionCalculator {

    public static func calculate(input: NationalPensionInput, common: CommonAssumptions) -> PensionStream {
        var stream = PensionStream.off()
        if !input.included { return stream }
        stream.included = true
        stream.startAge = input.startAge
        stream.endAgeExclusive = Int.max / 2
        if let e = Validation.amountError("국민연금 월 예상 수령액", input.monthlyAmount) {
            stream.errors.append(e)
            return stream
        }
        if input.startAge < 0 || input.startAge > 120 {
            stream.errors.append("국민연금 시작 나이를 확인해 주세요.")
            return stream
        }
        // 오늘 돈 가치 입력값을 그대로 사용(물가연동)
        stream.realMonthly = input.monthlyAmount
        if common.lifeExpectancy > 0 {
            stream.effectiveYears = max(0, common.lifeExpectancy - input.startAge)
        }
        let d = Finance.discountFactor(age: input.startAge, currentAge: common.currentAge, inflation: common.inflationRate)
        stream.nominalFirstMonthly = input.monthlyAmount * d
        stream.finalizeFiniteCheck()
        return stream
    }
}
