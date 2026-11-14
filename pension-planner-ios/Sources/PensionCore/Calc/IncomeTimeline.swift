import Foundation

public struct AgeIncome: Equatable, Identifiable {
    public var age: Int
    public var retirement: Double
    public var personal: Double
    public var housing: Double
    public var national: Double
    public var total: Double
    public var shortfall: Double

    public var id: Int { return age }

    public init(age: Int, retirement: Double, personal: Double, housing: Double, national: Double, target: Double) {
        self.age = age
        self.retirement = retirement
        self.personal = personal
        self.housing = housing
        self.national = national
        let sum = retirement + personal + housing + national
        self.total = sum
        self.shortfall = max(0, target - sum)
    }
}

public struct IncomeTimeline {
    public var rows: [AgeIncome]
    public var errors: [String]
    public var warnings: [String]
    public var retirementStream: PensionStream
    public var personalStream: PensionStream
    public var housingStream: PensionStream
    public var nationalStream: PensionStream
    public var target: Double

    /// 공통 가정(나이, 기대수명 등) 오류. 있으면 계산 자체를 하지 않는다.
    public var commonErrors: [String] = []

    public var hasErrors: Bool { return !errors.isEmpty }

    public var hasCommonErrors: Bool { return !commonErrors.isEmpty }

    /// 입력 오류 때문에 계산에서 제외된 연금 이름(포함 ON이고 오류가 있는 연금)
    public var excludedPensionNames: [String] {
        var names: [String] = []
        if retirementStream.included && retirementStream.hasErrors { names.append("퇴직연금") }
        if personalStream.included && personalStream.hasErrors { names.append("개인연금") }
        if housingStream.included && housingStream.hasErrors { names.append("주택연금") }
        if nationalStream.included && nationalStream.hasErrors { names.append("국민연금") }
        return names
    }

    /// 포함된 연금 중 하나라도 0보다 큰 월액이 있는가
    public var hasAnyIncome: Bool {
        for r in rows where r.total > 0 { return true }
        return false
    }

    public var maxShortfall: Double {
        var m: Double = 0
        for r in rows where r.shortfall > m { m = r.shortfall }
        return m
    }

    public static func build(plan: PlanInput) -> IncomeTimeline {
        let common = plan.common
        let ret = RetirementPensionCalculator.calculate(input: plan.retirement, common: common)
        let per = PersonalPensionCalculator.calculate(input: plan.personal, common: common)
        let hou = HousingPensionCalculator.calculate(input: plan.housing, common: common)
        let nat = NationalPensionCalculator.calculate(input: plan.national, common: common)

        let commonErrorList = Validation.commonErrors(common)
        var errors = commonErrorList
        var warnings: [String] = []
        for e in ret.errors { errors.append("[퇴직연금] " + e) }
        for e in per.errors { errors.append("[개인연금] " + e) }
        for e in hou.errors { errors.append("[주택연금] " + e) }
        for e in nat.errors { errors.append("[국민연금] " + e) }
        for w in ret.warnings { warnings.append("[퇴직연금] " + w) }
        for w in per.warnings { warnings.append("[개인연금] " + w) }
        for w in hou.warnings { warnings.append("[주택연금] " + w) }
        for w in nat.warnings { warnings.append("[국민연금] " + w) }

        var rows: [AgeIncome] = []
        if commonErrorList.isEmpty {
            var a = common.retirementAge
            while a < common.lifeExpectancy {
                rows.append(AgeIncome(age: a,
                                      retirement: ret.amount(atAge: a),
                                      personal: per.amount(atAge: a),
                                      housing: hou.amount(atAge: a),
                                      national: nat.amount(atAge: a),
                                      target: common.targetMonthly))
                a += 1
            }
        }
        return IncomeTimeline(rows: rows,
                              errors: errors,
                              warnings: warnings,
                              retirementStream: ret,
                              personalStream: per,
                              housingStream: hou,
                              nationalStream: nat,
                              target: common.targetMonthly,
                              commonErrors: commonErrorList)
    }
}
