import XCTest
@testable import PensionCore

/// 기대값은 docs/SPEC.md 9절 및 Tools/expected_values.py 출력과 같다.
final class PensionCoreTests: XCTestCase {

    // MARK: 헬퍼

    func common(cur: Int = 50, ret: Int = 60, life: Int = 90, pi: Double = 0, target: Double = 5_000_000) -> CommonAssumptions {
        return CommonAssumptions(currentAge: cur, retirementAge: ret, lifeExpectancy: life,
                                 inflationRate: pi, targetMonthly: target)
    }

    /// T1 기준 퇴직연금 입력
    func retT1(balance: Double = 100_000_000, salary: Double = 60_000_000, growth: Double = 0,
               acc: Double = 0, rate: Double = 1.0 / 12.0, years: Int = 20, payoutReturn: Double = 0) -> RetirementPensionInput {
        return RetirementPensionInput(included: true, mode: .calculate, currentBalance: balance,
                                      annualSalary: salary, salaryGrowthRate: growth, contributionRate: rate,
                                      accumulationReturn: acc, directBalanceAtRetirement: 0,
                                      startSameAsRetirement: true, startAge: 60, payoutYears: years,
                                      payoutReturn: payoutReturn)
    }

    /// T5 기준 개인연금 입력
    func perT5(acc: Double = 0, payoutReturn: Double = 0) -> PersonalPensionInput {
        return PersonalPensionInput(included: true, currentBalance: 0, monthlyContribution: 500_000,
                                    endSameAsRetirement: true, contributionEndAge: 60, accumulationReturn: acc,
                                    startSameAsRetirement: true, startAge: 60, payoutYears: 20,
                                    payoutReturn: payoutReturn)
    }

    /// 가입 나이는 은퇴 나이(60)를 따른다(은퇴 연기 표에서도 따라감, Python과 동일 가정)
    func housingDirect(_ amount: Double, join: Int = 60) -> HousingPensionInput {
        return HousingPensionInput(included: true, mode: .direct, joinSameAsRetirement: true, joinAge: join,
                                   directMonthlyPayment: amount)
    }

    func offRet() -> RetirementPensionInput { var r = RetirementPensionInput(); r.included = false; return r }
    func offPer() -> PersonalPensionInput { var p = PersonalPensionInput(); p.included = false; return p }
    func offHou() -> HousingPensionInput { return HousingPensionInput() }
    func offNat() -> NationalPensionInput { var n = NationalPensionInput(); n.included = false; return n }

    func integrated(pi: Double) -> PlanInput {
        return PlanInput(common: common(pi: pi),
                         retirement: retT1(),
                         personal: perT5(),
                         housing: housingDirect(1_000_000),
                         national: NationalPensionInput(included: true, monthlyAmount: 1_200_000, startAge: 65))
    }

    func row(_ t: IncomeTimeline, _ age: Int) -> AgeIncome {
        for r in t.rows where r.age == age { return r }
        XCTFail("행 없음: \(age)")
        return t.rows[0]
    }

    // MARK: Finance

    func testFinanceZeroRateBranches() {
        XCTAssertEqual(Finance.annuityFV(100, 0, 12), 1200, accuracy: 1e-9)
        XCTAssertEqual(Finance.pmt(1200, 0, 12), 100, accuracy: 1e-9)
        XCTAssertEqual(Finance.pmt(1200, 1e-14, 12), 100, accuracy: 1e-9)
        XCTAssertEqual(Finance.fv(100, 0, 12), 100, accuracy: 1e-9)
    }

    // MARK: 퇴직연금

    func testT1() {
        let s = RetirementPensionCalculator.calculate(input: retT1(), common: common())
        XCTAssertEqual(s.balanceAtEnd, 150_000_000, accuracy: 1)
        XCTAssertEqual(s.realMonthly, 625_000, accuracy: 1)
    }

    func testT2Inflation() {
        let s = RetirementPensionCalculator.calculate(input: retT1(), common: common(pi: 0.02))
        // Python 확정: 417526.0325
        XCTAssertEqual(s.realMonthly, 417_526.0325, accuracy: 5)
        for age in 60...79 {
            XCTAssertEqual(s.amount(atAge: age), 417_526.0325, accuracy: 5)
        }
        XCTAssertEqual(s.amount(atAge: 59), 0)
        XCTAssertEqual(s.amount(atAge: 80), 0)
    }

    func testT3() {
        let s = RetirementPensionCalculator.calculate(
            input: retT1(balance: 0, growth: 0.10, years: 1),
            common: common(cur: 58, ret: 60))
        XCTAssertEqual(s.balanceAtEnd, 10_500_000, accuracy: 1)
        XCTAssertEqual(s.realMonthly, 875_000, accuracy: 1)
    }

    func testT4() {
        let s = RetirementPensionCalculator.calculate(input: retT1(acc: 0.06, rate: 0), common: common())
        XCTAssertEqual(s.balanceAtEnd, 181_939_670, accuracy: 1000)
        XCTAssertEqual(s.realMonthly, 758_082, accuracy: 50)
    }

    func testT14ZeroPayoutReturn() {
        let s = RetirementPensionCalculator.calculate(input: retT1(payoutReturn: 0), common: common())
        XCTAssertFalse(s.realMonthly.isNaN)
        XCTAssertEqual(s.realMonthly, 625_000, accuracy: 1)
    }

    func testT15ShortPayout() {
        var r = RetirementPensionInput()
        r.mode = .direct
        r.directBalanceAtRetirement = 120_000_000
        r.accumulationReturn = 0
        r.payoutReturn = 0
        r.startSameAsRetirement = false
        r.startAge = 80
        r.payoutYears = 20
        let s = RetirementPensionCalculator.calculate(input: r, common: common())
        XCTAssertEqual(s.effectiveYears, 10)
        XCTAssertEqual(s.realMonthly, 1_000_000, accuracy: 1)
    }

    func testT16StartAtLifeExpectancy() {
        var r = retT1()
        r.startSameAsRetirement = false
        r.startAge = 90
        let s = RetirementPensionCalculator.calculate(input: r, common: common())
        XCTAssertEqual(s.realMonthly, 0)
        XCTAssertFalse(s.warnings.isEmpty)
        XCTAssertFalse(s.hasErrors)
    }

    func testRetirementStartBeforeRetirementIsError() {
        var r = retT1()
        r.startSameAsRetirement = false
        r.startAge = 55
        let s = RetirementPensionCalculator.calculate(input: r, common: common())
        XCTAssertTrue(s.hasErrors)
    }

    // MARK: 개인연금

    func testT5() {
        let s = PersonalPensionCalculator.calculate(input: perT5(), common: common())
        XCTAssertEqual(s.balanceAtEnd, 60_000_000, accuracy: 1)
        XCTAssertEqual(s.realMonthly, 250_000, accuracy: 1)
    }

    func testT6() {
        let s = PersonalPensionCalculator.calculate(input: perT5(acc: 0.06), common: common())
        XCTAssertEqual(s.balanceAtEnd, 81_939_670, accuracy: 1000)
        XCTAssertEqual(s.realMonthly, 341_415, accuracy: 10)
    }

    func testT7() {
        let s = PersonalPensionCalculator.calculate(input: perT5(acc: 0.06, payoutReturn: 0.06), common: common())
        XCTAssertEqual(s.realMonthly, 587_042, accuracy: 300)
    }

    func testPersonalWarningsAndErrors() {
        var p = perT5()
        p.startSameAsRetirement = false
        p.startAge = 60
        p.endSameAsRetirement = false
        p.contributionEndAge = 65
        XCTAssertTrue(PersonalPensionCalculator.calculate(input: p, common: common()).hasErrors)

        var q = perT5()
        q.payoutYears = 5
        let s = PersonalPensionCalculator.calculate(input: q, common: common())
        XCTAssertFalse(s.hasErrors)
        XCTAssertFalse(s.warnings.isEmpty)
    }

    // MARK: 주택연금

    func testT8() {
        let plan = PlanInput(common: common(), retirement: offRet(), personal: offPer(),
                             housing: housingDirect(1_000_000), national: offNat())
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertEqual(t.rows.count, 30)
        for age in 60...89 {
            XCTAssertEqual(row(t, age).housing, 1_000_000, accuracy: 1e-6)
        }
        // 그 외(은퇴 전)는 행 자체가 없고 59세 이하 금액은 0
        XCTAssertEqual(t.housingStream.amount(atAge: 59), 0)
        XCTAssertEqual(t.housingStream.amount(atAge: 90), 0)
    }

    /// [테스트용 가상 예시값] 표[60]=250,000원/1억 은 실제 공사 지급액이 아니다.
    func estimateInput(price: Double) -> HousingPensionInput {
        var h = HousingPensionInput()
        h.included = true
        h.mode = .estimate
        h.joinSameAsRetirement = false
        h.joinAge = 60
        h.currentHomePrice = price
        h.homePriceGrowthRate = 0
        h.priceTable = HousingPriceTable(rows: [HousingPriceRow(age: 60, monthlyPer100M: 250_000)],
                                         priceCap: 1_200_000_000,
                                         source: "테스트용 가상값", asOfDate: "테스트", confidence: "F")
        return h
    }

    func testT9() {
        let s = HousingPensionCalculator.calculate(input: estimateInput(price: 600_000_000), common: common())
        XCTAssertEqual(s.nominalFirstMonthly, 1_500_000, accuracy: 1)
    }

    func testT10() {
        let s = HousingPensionCalculator.calculate(input: estimateInput(price: 2_000_000_000), common: common())
        XCTAssertEqual(s.nominalFirstMonthly, 3_000_000, accuracy: 1)
    }

    func testT11MissingTableAge() {
        var h = estimateInput(price: 600_000_000)
        h.priceTable.rows = []
        let s = HousingPensionCalculator.calculate(input: h, common: common())
        XCTAssertTrue(s.hasErrors)
        XCTAssertEqual(s.realMonthly, 0)
        XCTAssertFalse(s.realMonthly.isNaN)
        XCTAssertEqual(s.amount(atAge: 70), 0)
    }

    func testDefaultHousingTableIsBlank() {
        let h = HousingPensionInput()
        XCTAssertFalse(h.included)
        XCTAssertTrue(h.priceTable.rows.isEmpty)
        XCTAssertEqual(h.priceTable.source, "확인할 수 없음")
        XCTAssertEqual(h.priceTable.asOfDate, "확인할 수 없음")
        XCTAssertEqual(h.priceTable.confidence, "F")
    }

    func testT17HousingNominalFixed() {
        // v1.1: 명목 고정액 -> 오늘 돈 월액 = 1,000,000 / 1.02^(a-50)
        let plan = PlanInput(common: common(pi: 0.02), retirement: offRet(), personal: offPer(),
                             housing: housingDirect(1_000_000), national: offNat())
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertEqual(row(t, 60).housing, 820_348.2999, accuracy: 5)
        XCTAssertEqual(row(t, 61).housing, 804_263.0391, accuracy: 5)
        XCTAssertEqual(row(t, 70).housing, 672_971.3331, accuracy: 5)
        XCTAssertEqual(row(t, 80).housing, 552_070.8890, accuracy: 5)
        XCTAssertEqual(row(t, 89).housing, 461_948.2235, accuracy: 5)
        for age in 60...89 {
            let expected = 1_000_000.0 / pow(1.02, Double(age - 50))
            XCTAssertEqual(row(t, age).housing, expected, accuracy: 5)
        }
        for age in 60...88 {
            XCTAssertTrue(row(t, age).housing > row(t, age + 1).housing)
        }
    }

    // MARK: 국민연금, 표기

    func testT12National() {
        let plan = PlanInput(common: common(pi: 0.02), retirement: offRet(), personal: offPer(),
                             housing: offHou(),
                             national: NationalPensionInput(included: true, monthlyAmount: 1_200_000, startAge: 65))
        let t = IncomeTimeline.build(plan: plan)
        for age in 60...64 { XCTAssertEqual(row(t, age).national, 0) }
        for age in 65...89 { XCTAssertEqual(row(t, age).national, 1_200_000, accuracy: 1e-6) }
    }

    func testT13MoneyFormat() {
        XCTAssertEqual(MoneyFormat.manwon(3_125_000), "313만원")
        XCTAssertEqual(MoneyFormat.manwon(5_000_000), "500만원")
        XCTAssertEqual(MoneyFormat.manwon(0), "0만원")
        XCTAssertEqual(MoneyFormat.manwon(4_999), "0만원")
        XCTAssertEqual(MoneyFormat.manwon(625_000), "63만원")
        XCTAssertEqual(MoneyFormat.manwon(Double.nan), "계산할 수 없음")
        XCTAssertEqual(MoneyFormat.manwon(12_345_678_000), "1,234,568만원")
    }

    // MARK: 통합 (π=0)

    func testIntegratedZeroInflation() {
        let plan = integrated(pi: 0)
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertFalse(t.hasErrors)
        for age in 60...64 {
            XCTAssertEqual(row(t, age).total, 1_875_000, accuracy: 1)
            XCTAssertEqual(row(t, age).shortfall, 3_125_000, accuracy: 1)
        }
        for age in 65...79 {
            XCTAssertEqual(row(t, age).total, 3_075_000, accuracy: 1)
            XCTAssertEqual(row(t, age).shortfall, 1_925_000, accuracy: 1)
        }
        for age in 80...89 {
            XCTAssertEqual(row(t, age).total, 2_200_000, accuracy: 1)
            XCTAssertEqual(row(t, age).shortfall, 2_800_000, accuracy: 1)
        }
        let g = GapAnalyzer.summarize(timeline: t)
        XCTAssertFalse(g.achieved)
        XCTAssertEqual(g.segments.count, 3)
        XCTAssertEqual(g.worst?.startAge, 60)
        XCTAssertEqual(g.worst?.endAge, 64)
        XCTAssertEqual(MoneyFormat.manwon(g.worst?.maxShortfall ?? 0), "313만원")
        XCTAssertEqual(g.best?.startAge, 65)
        XCTAssertEqual(g.best?.endAge, 79)
        XCTAssertEqual(MoneyFormat.manwon(g.best?.maxShortfall ?? 0), "193만원")
        XCTAssertTrue(g.blankRanges.isEmpty)

        let f = GapAnalyzer.fillGap(plan: plan, timeline: t)
        XCTAssertEqual(f.status, .ok)
        XCTAssertEqual(f.windowStart, 60)
        XCTAssertEqual(f.windowEnd, 79)
        XCTAssertEqual(f.delta, 3_125_000, accuracy: 1)
        XCTAssertEqual(f.payoutPerWon, 0.5, accuracy: 1e-9)
        XCTAssertEqual(f.extraMonthly, 6_250_000, accuracy: 100)
        XCTAssertEqual(f.uncovered, [AgeRange(startAge: 80, endAge: 89)])
        XCTAssertEqual(bisectExtra(plan: plan, delta: f.delta), f.extraMonthly, accuracy: 100)
    }

    /// 추가 납입 후 W 구간 개인연금 증가분이 delta 가 되는 납입액을 이분법으로 찾는다.
    func bisectExtra(plan: PlanInput, delta: Double) -> Double {
        let base = PersonalPensionCalculator.calculate(input: plan.personal, common: plan.common).realMonthly
        var lo: Double = 0
        var hi: Double = 1_000_000_000
        var k = 0
        while k < 200 {
            let mid = (lo + hi) / 2
            var p = plan.personal
            p.monthlyContribution += mid
            let v = PersonalPensionCalculator.calculate(input: p, common: plan.common).realMonthly
            if v - base < delta { lo = mid } else { hi = mid }
            k += 1
        }
        return (lo + hi) / 2
    }

    func testPostponeTableZeroInflation() {
        let rows = GapAnalyzer.postponeTable(plan: integrated(pi: 0))
        let expected: [Double] = [3_079_166.6667, 3_033_333.3333, 2_987_500.0, 2_941_666.6667, 2_800_000.0]
        XCTAssertEqual(rows.count, 5)
        for idx in 0..<min(5, rows.count) {
            XCTAssertEqual(rows[idx].retirementAge, 61 + idx)
            XCTAssertEqual(rows[idx].maxShortfall, expected[idx], accuracy: 1)
            XCTAssertFalse(rows[idx].achieved)
        }
    }

    // MARK: 통합 (π=2%) - Python 확정값

    func testIntegratedTwoPercentInflation() {
        let plan = integrated(pi: 0.02)
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertFalse(t.hasErrors)
        let r60 = row(t, 60)
        XCTAssertEqual(r60.retirement, 417_526.0325, accuracy: 5)
        XCTAssertEqual(r60.personal, 167_010.4130, accuracy: 5)
        XCTAssertEqual(r60.housing, 820_348.2999, accuracy: 5)
        XCTAssertEqual(r60.total, 1_404_884.7454, accuracy: 5)
        XCTAssertEqual(r60.shortfall, 3_595_115.2546, accuracy: 5)
        XCTAssertEqual(row(t, 64).housing, 757_875.0246, accuracy: 5)
        XCTAssertEqual(row(t, 64).shortfall, 3_657_588.5299, accuracy: 5)
        XCTAssertEqual(row(t, 65).housing, 743_014.7300, accuracy: 5)
        XCTAssertEqual(row(t, 65).shortfall, 2_472_448.8245, accuracy: 5)
        XCTAssertEqual(row(t, 79).housing, 563_112.3068, accuracy: 5)
        XCTAssertEqual(row(t, 79).shortfall, 2_652_351.2477, accuracy: 5)
        XCTAssertEqual(row(t, 80).shortfall, 3_247_929.1110, accuracy: 5)
        XCTAssertEqual(row(t, 89).shortfall, 3_338_051.7765, accuracy: 5)

        let g = GapAnalyzer.summarize(timeline: t)
        XCTAssertEqual(g.segments.count, 3)
        XCTAssertEqual(g.segments[0].maxShortfall, 3_657_588.5299, accuracy: 5)
        XCTAssertEqual(g.segments[0].averageShortfall, 3_626_661.1417, accuracy: 5)
        XCTAssertEqual(g.segments[1].maxShortfall, 2_652_351.2477, accuracy: 5)
        XCTAssertEqual(g.segments[1].averageShortfall, 2_566_254.4951, accuracy: 5)
        XCTAssertEqual(g.segments[2].maxShortfall, 3_338_051.7765, accuracy: 5)
        XCTAssertEqual(g.segments[2].averageShortfall, 3_294_179.5836, accuracy: 5)
        XCTAssertEqual(g.worst?.startAge, 60)
        XCTAssertEqual(g.best?.startAge, 65)

        let f = GapAnalyzer.fillGap(plan: plan, timeline: t)
        XCTAssertEqual(f.status, .ok)
        XCTAssertEqual(f.delta, 3_657_588.5299, accuracy: 5)
        XCTAssertEqual(f.payoutPerWon, 0.3340208260, accuracy: 1e-9)
        XCTAssertEqual(f.extraMonthly, 10_950_181.0822, accuracy: 100)
        XCTAssertEqual(f.uncovered, [AgeRange(startAge: 80, endAge: 89)])
        XCTAssertEqual(bisectExtra(plan: plan, delta: f.delta), f.extraMonthly, accuracy: 100)

        let rows = GapAnalyzer.postponeTable(plan: plan)
        let expected: [Double] = [3_639_031.8174, 3_621_427.5543, 3_604_745.5242, 3_588_956.3294, 3_338_051.7765]
        XCTAssertEqual(rows.count, 5)
        for idx in 0..<min(5, rows.count) {
            XCTAssertEqual(rows[idx].retirementAge, 61 + idx)
            XCTAssertEqual(rows[idx].maxShortfall, expected[idx], accuracy: 5)
            XCTAssertFalse(rows[idx].achieved)
        }
    }

    // MARK: 경계, 저장

    func testInvalidCommonGivesErrorsNotCrash() {
        var plan = integrated(pi: 0)
        plan.common.retirementAge = 40
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertTrue(t.hasErrors)
        XCTAssertTrue(t.rows.isEmpty)
    }

    func testPensionErrorExcludesOnlyThatPension() {
        var plan = integrated(pi: 0)
        plan.retirement.startSameAsRetirement = false
        plan.retirement.startAge = 55   // 오류: 은퇴 나이보다 빠름
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertTrue(t.hasErrors)
        XCTAssertFalse(t.hasCommonErrors)
        XCTAssertEqual(t.excludedPensionNames, ["퇴직연금"])
        // 퇴직연금만 빠진다: 60~64세 합계 = 개인 250,000 + 주택 1,000,000
        XCTAssertEqual(row(t, 60).total, 1_250_000, accuracy: 1)
        XCTAssertEqual(row(t, 60).retirement, 0)
        let g = GapAnalyzer.summarize(timeline: t)
        XCTAssertFalse(g.segments.isEmpty)
        let f = GapAnalyzer.fillGap(plan: plan, timeline: t)
        XCTAssertEqual(f.status, .ok)
    }

    func testCommonErrorStillBlocks() {
        var plan = integrated(pi: 0)
        plan.common.retirementAge = 40
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertTrue(t.hasCommonErrors)
    }

    func testAllOffGivesNoIncome() {
        let plan = PlanInput(common: common(), retirement: offRet(), personal: offPer(),
                             housing: offHou(), national: offNat())
        let t = IncomeTimeline.build(plan: plan)
        XCTAssertFalse(t.hasAnyIncome)
    }

    func testCodableRoundTripAndDefaults() throws {
        let plan = integrated(pi: 0.02)
        let data = try JSONEncoder().encode(plan)
        let decoded = try JSONDecoder().decode(PlanInput.self, from: data)
        XCTAssertEqual(plan, decoded)

        let empty = try JSONDecoder().decode(PlanInput.self, from: "{}".data(using: .utf8)!)
        XCTAssertEqual(empty.common.currentAge, 40)
        XCTAssertEqual(empty.housing.priceTable.confidence, "F")
        XCTAssertEqual(empty.schemaVersion, 1)
    }
}
