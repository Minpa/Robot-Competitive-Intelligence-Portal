import Foundation

public enum HousingPensionCalculator {

    public static let tableMissingMessage = "표에 해당 나이 값을 입력하세요."

    public static func effectiveJoinAge(_ input: HousingPensionInput, _ common: CommonAssumptions) -> Int {
        return input.joinSameAsRetirement ? common.retirementAge : input.joinAge
    }

    public static func calculate(input: HousingPensionInput, common: CommonAssumptions) -> PensionStream {
        var stream = PensionStream.off()
        if !input.included { return stream }
        stream.included = true
        if !Validation.commonErrors(common).isEmpty { return stream }

        let join = effectiveJoinAge(input, common)
        stream.startAge = join
        stream.endAgeExclusive = common.lifeExpectancy
        stream.isNominalFixed = true
        stream.currentAge = common.currentAge
        stream.inflation = common.inflationRate

        if join < common.currentAge {
            stream.errors.append("주택연금 가입 나이는 현재 나이보다 어릴 수 없어요.")
            return stream
        }

        var firstPayment: Double = 0
        if input.mode == .direct {
            if let e = Validation.amountError("주택연금 첫 월지급액", input.directMonthlyPayment) {
                stream.errors.append(e)
                return stream
            }
            firstPayment = input.directMonthlyPayment
            if firstPayment <= 0 {
                stream.warnings.append("한국주택금융공사 예상연금 조회 결과(가입 시점 첫 월지급액)를 입력해 주세요.")
            }
        } else {
            if let e = Validation.amountError("현재 주택가격", input.currentHomePrice) {
                stream.errors.append(e)
                return stream
            }
            if let e = Validation.rateError("주택가격 상승률", input.homePriceGrowthRate) {
                stream.errors.append(e)
                return stream
            }
            if input.currentHomePrice <= 0 {
                stream.warnings.append("현재 주택가격을 입력해 주세요.")
            } else if let per100M = input.priceTable.monthlyPer100M(forAge: join) {
                let grown = input.currentHomePrice * pow(1.0 + input.homePriceGrowthRate, Double(max(0, join - common.currentAge)))
                var capped = grown
                if input.priceTable.priceCap > 0 {
                    capped = min(grown, input.priceTable.priceCap)
                } else {
                    stream.warnings.append("주택가격 상한이 비어 있어 상한 없이 계산했어요.")
                }
                firstPayment = capped / 100_000_000.0 * per100M
            } else {
                stream.errors.append(tableMissingMessage)
                return stream
            }
        }

        stream.nominalFirstMonthly = firstPayment
        stream.realMonthly = firstPayment / Finance.discountFactor(age: join, currentAge: common.currentAge, inflation: common.inflationRate)
        stream.effectiveYears = max(0, common.lifeExpectancy - join)
        if join >= common.lifeExpectancy {
            stream.realMonthly = 0
            stream.nominalFirstMonthly = 0
            stream.warnings.append("주택연금 가입 나이가 기대수명 이상이라 월 수령액을 0원으로 봤어요.")
        }
        stream.finalizeFiniteCheck()
        return stream
    }
}
