import Foundation

public struct AgeRange: Equatable {
    public var startAge: Int
    public var endAge: Int

    public init(startAge: Int, endAge: Int) {
        self.startAge = startAge
        self.endAge = endAge
    }

    public var text: String {
        return MoneyFormat.ageRange(startAge, endAge)
    }
}

/// 부족 구간: 부족>0 이고 받는 연금 구성이 같은 연속 나이 묶음
public struct GapSegment: Equatable, Identifiable {
    public var startAge: Int
    public var endAge: Int
    public var averageShortfall: Double
    public var maxShortfall: Double
    /// 구간 평균 월수입(합계)
    public var averageTotal: Double

    public var id: Int { return startAge }

    public init(startAge: Int, endAge: Int, averageShortfall: Double, maxShortfall: Double, averageTotal: Double) {
        self.startAge = startAge
        self.endAge = endAge
        self.averageShortfall = averageShortfall
        self.maxShortfall = maxShortfall
        self.averageTotal = averageTotal
    }

    public var text: String {
        return MoneyFormat.ageRange(startAge, endAge)
    }
}

public struct GapSummary {
    public var achieved: Bool
    public var segments: [GapSegment]
    /// 가장 부족한 구간(구간별 최대 부족이 가장 큰 구간)
    public var worst: GapSegment?
    /// 가장 덜 부족한 구간(구간별 최대 부족이 가장 작은 구간)
    public var best: GapSegment?
    /// 합계가 0인 공백 구간
    public var blankRanges: [AgeRange]

    public init(achieved: Bool, segments: [GapSegment], worst: GapSegment?, best: GapSegment?, blankRanges: [AgeRange]) {
        self.achieved = achieved
        self.segments = segments
        self.worst = worst
        self.best = best
        self.blankRanges = blankRanges
    }
}

public enum FillStatus: Equatable {
    case ok
    case alreadyAchieved
    case notComputable
}

public struct FillResult {
    public var status: FillStatus
    public var windowStart: Int
    public var windowEnd: Int
    /// 개인연금 지급 구간에서 가장 큰 부족액(오늘 돈, 원)
    public var delta: Double
    /// 월 납입 1원당 오늘 돈 월 수령액
    public var payoutPerWon: Double
    /// 추가로 더 내야 할 월 납입액(명목, 원)
    public var extraMonthly: Double
    /// 개인연금으로 메울 수 없는 구간
    public var uncovered: [AgeRange]
    public var personalWasOff: Bool
    public var message: String

    public init(status: FillStatus, windowStart: Int = 0, windowEnd: Int = 0, delta: Double = 0,
                payoutPerWon: Double = 0, extraMonthly: Double = 0, uncovered: [AgeRange] = [],
                personalWasOff: Bool = false, message: String = "") {
        self.status = status
        self.windowStart = windowStart
        self.windowEnd = windowEnd
        self.delta = delta
        self.payoutPerWon = payoutPerWon
        self.extraMonthly = extraMonthly
        self.uncovered = uncovered
        self.personalWasOff = personalWasOff
        self.message = message
    }
}

public struct PostponeRow: Equatable, Identifiable {
    public var retirementAge: Int
    public var maxShortfall: Double
    public var achieved: Bool

    public var id: Int { return retirementAge }

    public init(retirementAge: Int, maxShortfall: Double, achieved: Bool) {
        self.retirementAge = retirementAge
        self.maxShortfall = maxShortfall
        self.achieved = achieved
    }
}

public enum GapAnalyzer {
    /// 이 값(원) 이하의 부족은 0으로 본다(부동소수 오차 방지)
    public static let tolerance: Double = 0.5

    static func ranges(fromSortedAges ages: [Int]) -> [AgeRange] {
        var result: [AgeRange] = []
        var start = 0
        var prev = 0
        var open = false
        for a in ages {
            if open && a == prev + 1 {
                prev = a
            } else {
                if open { result.append(AgeRange(startAge: start, endAge: prev)) }
                start = a
                prev = a
                open = true
            }
        }
        if open { result.append(AgeRange(startAge: start, endAge: prev)) }
        return result
    }

    static func activeKey(_ r: AgeIncome) -> [Bool] {
        return [r.retirement > 0, r.personal > 0, r.housing > 0, r.national > 0]
    }

    public static func summarize(timeline: IncomeTimeline) -> GapSummary {
        var segments: [GapSegment] = []
        var curStart = 0
        var curEnd = 0
        var curKey: [Bool] = []
        var curShort: [Double] = []
        var curTotal: [Double] = []
        var open = false

        func close() {
            if open && !curShort.isEmpty {
                var sum: Double = 0
                var mx: Double = 0
                for v in curShort { sum += v; if v > mx { mx = v } }
                var tsum: Double = 0
                for v in curTotal { tsum += v }
                let n = Double(curShort.count)
                segments.append(GapSegment(startAge: curStart, endAge: curEnd,
                                           averageShortfall: sum / n, maxShortfall: mx, averageTotal: tsum / n))
            }
            open = false
            curShort = []
            curTotal = []
        }

        for r in timeline.rows {
            if r.shortfall > tolerance {
                let key = activeKey(r)
                if open && key == curKey && r.age == curEnd + 1 {
                    curEnd = r.age
                } else {
                    close()
                    curStart = r.age
                    curEnd = r.age
                    curKey = key
                    open = true
                }
                curShort.append(r.shortfall)
                curTotal.append(r.total)
            } else {
                close()
            }
        }
        close()

        var worst: GapSegment? = nil
        var best: GapSegment? = nil
        for s in segments {
            if worst == nil || s.maxShortfall > worst!.maxShortfall { worst = s }
            if best == nil || s.maxShortfall < best!.maxShortfall { best = s }
        }

        var blankAges: [Int] = []
        for r in timeline.rows where r.total <= 0 { blankAges.append(r.age) }

        return GapSummary(achieved: segments.isEmpty,
                          segments: segments,
                          worst: worst,
                          best: best,
                          blankRanges: ranges(fromSortedAges: blankAges))
    }

    /// U6: 개인연금 지급 구간(W) 중 가장 부족한 해도 목표가 되도록 하는 추가 월 납입액
    public static func fillGap(plan: PlanInput, timeline: IncomeTimeline) -> FillResult {
        let wasOff = !plan.personal.included
        if timeline.hasErrors || timeline.rows.isEmpty {
            return FillResult(status: .notComputable, personalWasOff: wasOff,
                              message: "입력 오류를 먼저 고쳐 주세요.")
        }
        let probe = PersonalPensionCalculator.monthlyPayoutPerWonContribution(input: plan.personal, common: plan.common)
        if probe.hasErrors || !(probe.realMonthly > 0) {
            return FillResult(status: .notComputable, personalWasOff: wasOff,
                              message: "개인연금 수령 설정을 확인해 주세요. 지금 설정으로는 개인연금을 받는 구간이 없어요.")
        }
        var windowAges: [Int] = []
        var delta: Double = 0
        var uncoveredAges: [Int] = []
        for r in timeline.rows {
            if probe.amount(atAge: r.age) > 0 {
                windowAges.append(r.age)
                if r.shortfall > delta { delta = r.shortfall }
            } else if r.shortfall > tolerance {
                uncoveredAges.append(r.age)
            }
        }
        if windowAges.isEmpty {
            return FillResult(status: .notComputable, personalWasOff: wasOff,
                              message: "개인연금을 받는 구간이 은퇴 후 기간 안에 없어요.")
        }
        let uncovered = ranges(fromSortedAges: uncoveredAges)
        let p1 = probe.realMonthly
        let wStart = windowAges[0]
        let wEnd = windowAges[windowAges.count - 1]
        if delta <= tolerance {
            return FillResult(status: .alreadyAchieved, windowStart: wStart, windowEnd: wEnd, delta: 0,
                              payoutPerWon: p1, extraMonthly: 0, uncovered: uncovered, personalWasOff: wasOff,
                              message: "개인연금을 받는 구간은 이미 목표를 채워요.")
        }
        let extra = delta / p1
        if !extra.isFinite {
            return FillResult(status: .notComputable, personalWasOff: wasOff, message: MoneyFormat.notComputable)
        }
        return FillResult(status: .ok, windowStart: wStart, windowEnd: wEnd, delta: delta,
                          payoutPerWon: p1, extraMonthly: extra, uncovered: uncovered, personalWasOff: wasOff,
                          message: "")
    }

    /// 은퇴를 k년 늦춘 계획(5.9). 토글 ON 항목은 은퇴 나이를 따르고, OFF 항목은 max(원래값, 새 은퇴 나이).
    public static func postponedPlan(plan: PlanInput, years k: Int) -> PlanInput {
        var p = plan
        let newR = plan.common.retirementAge + k
        p.common.retirementAge = newR

        // 퇴직연금
        if !plan.retirement.startSameAsRetirement {
            p.retirement.startAge = max(plan.retirement.startAge, newR)
        }

        // 개인연금: 납입 종료/수령 시작을 명시값으로 확정(수령 시작 >= 납입 종료 보장)
        let endBase = plan.personal.endSameAsRetirement ? newR : max(plan.personal.contributionEndAge, newR)
        var startBase = plan.personal.startSameAsRetirement ? newR : max(plan.personal.startAge, newR)
        startBase = max(startBase, endBase)
        p.personal.endSameAsRetirement = false
        p.personal.contributionEndAge = endBase
        p.personal.startSameAsRetirement = false
        p.personal.startAge = startBase

        // 주택연금: 토글 ON이면 새 은퇴 나이를 따라감(계산기가 처리), OFF면 그대로
        return p
    }

    public static func postponeTable(plan: PlanInput) -> [PostponeRow] {
        var rows: [PostponeRow] = []
        let base = IncomeTimeline.build(plan: plan)
        if base.hasErrors { return rows }
        var k = 1
        while k <= 5 {
            let newR = plan.common.retirementAge + k
            if plan.common.lifeExpectancy > newR {
                let np = postponedPlan(plan: plan, years: k)
                let t = IncomeTimeline.build(plan: np)
                if !t.hasErrors && !t.rows.isEmpty {
                    let mx = t.maxShortfall
                    rows.append(PostponeRow(retirementAge: newR, maxShortfall: mx, achieved: mx <= tolerance))
                }
            }
            k += 1
        }
        return rows
    }
}
