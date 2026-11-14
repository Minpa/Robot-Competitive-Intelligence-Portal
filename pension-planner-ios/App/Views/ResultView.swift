import SwiftUI
import PensionCore

struct ResultView: View {
    @EnvironmentObject var store: PlanStore

    var body: some View {
        let plan = store.plan
        let timeline = IncomeTimeline.build(plan: plan)

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(Notices.always)
                        .font(.footnote)
                        .foregroundColor(.secondary)

                    if timeline.hasCommonErrors {
                        errorCard(timeline)
                    } else if !timeline.hasAnyIncome {
                        exclusionCard(timeline)
                        Text("입력 탭에서 연금 정보를 입력하세요")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 40)
                    } else {
                        exclusionCard(timeline)
                        content(plan: plan, timeline: timeline)
                    }
                }
                .padding()
            }
            .navigationTitle("결과")
        }
    }

    // MARK: 오류

    private func errorCard(_ timeline: IncomeTimeline) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("입력을 확인해 주세요").font(.headline).foregroundColor(.red)
            ForEach(Array(timeline.commonErrors.enumerated()), id: \.offset) { item in
                Text(item.element).font(.footnote).foregroundColor(.red)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.08))
        .cornerRadius(12)
    }

    /// 입력 오류가 있는 연금만 빼고 계산했음을 알리는 경고
    @ViewBuilder
    private func exclusionCard(_ timeline: IncomeTimeline) -> some View {
        if !timeline.excludedPensionNames.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                ForEach(timeline.excludedPensionNames, id: \.self) { name in
                    Text("\(name)은 입력 오류로 제외했습니다")
                        .font(.subheadline).foregroundColor(.orange)
                }
                ForEach(Array(timeline.errors.enumerated()), id: \.offset) { item in
                    Text(item.element).font(.footnote).foregroundColor(.red)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.orange.opacity(0.12))
            .cornerRadius(12)
        }
    }

    // MARK: 본문

    @ViewBuilder
    private func content(plan: PlanInput, timeline: IncomeTimeline) -> some View {
        let summary = GapAnalyzer.summarize(timeline: timeline)
        let fill = GapAnalyzer.fillGap(plan: plan, timeline: timeline)
        let postpone = GapAnalyzer.postponeTable(plan: plan)

        summaryCard(summary: summary, timeline: timeline)

        VStack(alignment: .leading, spacing: 8) {
            Text("나이별 월수입").font(.headline)
            IncomeChartView(timeline: timeline)
        }

        segmentTable(timeline: timeline)
        fillCard(fill: fill, plan: plan)
        postponeCard(rows: postpone, plan: plan)
    }

    private func joinRanges(_ ranges: [AgeRange]) -> String {
        return ranges.map { $0.text }.joined(separator: ", ")
    }

    // MARK: ① 요약

    private func summaryCard(summary: GapSummary, timeline: IncomeTimeline) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if summary.achieved {
                Text("✔ 은퇴 후 모든 나이에서 목표 \(MoneyFormat.manwon(timeline.target))을 채워요")
                    .font(.headline).foregroundColor(.green)
            } else {
                Text("✖ 목표 \(MoneyFormat.manwon(timeline.target))에 못 미치는 구간이 있어요")
                    .font(.headline).foregroundColor(.red)
                if let w = summary.worst {
                    Text("가장 부족한 구간: \(w.text), 월 \(MoneyFormat.manwon(w.maxShortfall)) 부족 (구간 평균 \(MoneyFormat.manwon(w.averageShortfall)))")
                }
                if summary.segments.count >= 2, let b = summary.best {
                    Text("가장 덜 부족한 구간: \(b.text), 월 \(MoneyFormat.manwon(b.maxShortfall)) 부족 (구간 평균 \(MoneyFormat.manwon(b.averageShortfall)))")
                }
            }
            if !summary.blankRanges.isEmpty {
                Text("연금 수입이 없는 공백 구간: " + joinRanges(summary.blankRanges)).foregroundColor(.orange)
            }
            ForEach(Array(timeline.warnings.enumerated()), id: \.offset) { item in
                Text(item.element).font(.footnote).foregroundColor(.orange)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gray.opacity(0.12))
        .cornerRadius(12)
    }

    // MARK: ③ 구간표

    private struct TableGroup: Identifiable {
        var id: Int
        var startAge: Int
        var endAge: Int
        var row: AgeIncome
    }

    private func groups(_ timeline: IncomeTimeline) -> [TableGroup] {
        var result: [TableGroup] = []
        for r in timeline.rows {
            if let last = result.last, sameDisplay(last.row, r) {
                result[result.count - 1].endAge = r.age
            } else {
                result.append(TableGroup(id: r.age, startAge: r.age, endAge: r.age, row: r))
            }
        }
        return result
    }

    private func sameDisplay(_ a: AgeIncome, _ b: AgeIncome) -> Bool {
        return MoneyFormat.manwonValue(a.retirement) == MoneyFormat.manwonValue(b.retirement)
            && MoneyFormat.manwonValue(a.personal) == MoneyFormat.manwonValue(b.personal)
            && MoneyFormat.manwonValue(a.housing) == MoneyFormat.manwonValue(b.housing)
            && MoneyFormat.manwonValue(a.national) == MoneyFormat.manwonValue(b.national)
            && MoneyFormat.manwonValue(a.shortfall) == MoneyFormat.manwonValue(b.shortfall)
    }

    private func cell(_ text: String, width: CGFloat, bold: Bool = false) -> some View {
        Text(text)
            .font(.caption)
            .fontWeight(bold ? Font.Weight.bold : Font.Weight.regular)
            .frame(width: width, alignment: .trailing)
    }

    private func segmentTable(timeline: IncomeTimeline) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("나이 구간별 월수입 (만원, 오늘 돈)").font(.headline)
            ScrollView(.horizontal, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("나이").font(.caption).bold().frame(width: 70, alignment: .leading)
                        cell("퇴직", width: 50, bold: true)
                        cell("개인", width: 50, bold: true)
                        cell("주택", width: 50, bold: true)
                        cell("국민", width: 50, bold: true)
                        cell("합계", width: 56, bold: true)
                        cell("부족", width: 56, bold: true)
                    }
                    Divider()
                    ForEach(groups(timeline)) { g in
                        HStack {
                            Text(MoneyFormat.ageRange(g.startAge, g.endAge))
                                .font(.caption)
                                .frame(width: 70, alignment: .leading)
                            cell(plain(g.row.retirement), width: 50)
                            cell(plain(g.row.personal), width: 50)
                            cell(plain(g.row.housing), width: 50)
                            cell(plain(g.row.national), width: 50)
                            cell(plain(g.row.total), width: 56)
                            cell(plain(g.row.shortfall), width: 56, bold: g.row.shortfall > GapAnalyzer.tolerance)
                        }
                    }
                }
            }
            Text("주택연금은 고정액이라 물가가 오를수록 오늘 돈 가치로는 해마다 줄어요.")
                .font(.footnote).foregroundColor(.secondary)
        }
    }

    private func plain(_ won: Double) -> String {
        return MoneyFormat.groupedInteger(MoneyFormat.manwonValue(won))
    }

    // MARK: ④ 부족분 메우기

    private func fillCard(fill: FillResult, plan: PlanInput) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("개인연금으로 부족분 메우기").font(.headline)
            if fill.personalWasOff {
                Text("개인연금을 켜면 계산됩니다. (지금은 개인연금이 꺼져 있어서, 현재 개인연금 수령 설정 기준으로 참고용 값을 보여줘요.)")
                    .foregroundColor(.orange)
            }
            switch fill.status {
            case .notComputable:
                Text(fill.message).foregroundColor(.secondary)
            case .alreadyAchieved:
                Text("\(MoneyFormat.ageRange(fill.windowStart, fill.windowEnd)) 개인연금을 받는 동안은 이미 목표를 채워요.")
            case .ok:
                Text("개인연금을 받는 \(MoneyFormat.ageRange(fill.windowStart, fill.windowEnd)) 중 가장 부족한 해(월 \(MoneyFormat.manwon(fill.delta)) 부족)도 목표가 되려면, 지금보다 월 납입액을 약 \(MoneyFormat.manwon(fill.extraMonthly)) 더 내야 해요.")
                Text("추가 월 납입액은 지금부터 납입 종료 나이까지 매달 같은 금액(명목)을 더 낸다고 가정한 값이에요.")
                    .font(.footnote).foregroundColor(.secondary)
            }
            if !fill.uncovered.isEmpty && fill.status != .notComputable {
                Text("개인연금으로 메울 수 없는 구간: " + joinRanges(fill.uncovered)).foregroundColor(.orange)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gray.opacity(0.12))
        .cornerRadius(12)
    }

    // MARK: ⑤ 은퇴 연기

    private func postponeCard(rows: [PostponeRow], plan: PlanInput) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("은퇴를 늦추면?").font(.headline)
            if rows.isEmpty {
                Text("계산할 수 있는 경우가 없어요.").foregroundColor(.secondary)
            } else {
                HStack {
                    Text("은퇴 나이").font(.caption).bold().frame(maxWidth: .infinity, alignment: .leading)
                    Text("최대 부족액").font(.caption).bold().frame(maxWidth: .infinity, alignment: .trailing)
                    Text("달성").font(.caption).bold().frame(width: 50, alignment: .trailing)
                }
                Divider()
                ForEach(rows) { r in
                    HStack {
                        Text("\(r.retirementAge)세 (+\(r.retirementAge - plan.common.retirementAge)년)")
                            .font(.caption).frame(maxWidth: .infinity, alignment: .leading)
                        Text(MoneyFormat.manwon(r.maxShortfall))
                            .font(.caption).frame(maxWidth: .infinity, alignment: .trailing)
                        Text(r.achieved ? "✔" : "✖")
                            .font(.caption).foregroundColor(r.achieved ? .green : .red)
                            .frame(width: 50, alignment: .trailing)
                    }
                }
                Text("'은퇴 나이와 같게'를 켠 항목은 은퇴를 따라 늦춰지고, 끈 항목은 원래 값과 새 은퇴 나이 중 큰 값을 써요. 국민연금은 그대로예요.")
                    .font(.footnote).foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gray.opacity(0.12))
        .cornerRadius(12)
    }
}
