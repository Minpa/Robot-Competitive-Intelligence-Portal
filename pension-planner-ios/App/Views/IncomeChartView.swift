import SwiftUI
import Charts
import PensionCore

private struct StackItem: Identifiable {
    let id: Int
    let age: Int
    let series: String
    let manwon: Double
}

struct IncomeChartView: View {
    let timeline: IncomeTimeline

    private static let names = ["퇴직연금", "개인연금", "주택연금", "국민연금"]
    private static let colors: [Color] = [.blue, .green, .orange, .purple]

    private var items: [StackItem] {
        var result: [StackItem] = []
        var n = 0
        for r in timeline.rows {
            let values = [r.retirement, r.personal, r.housing, r.national]
            for idx in 0..<4 {
                result.append(StackItem(id: n, age: r.age, series: IncomeChartView.names[idx],
                                        manwon: values[idx] / 10_000.0))
                n += 1
            }
        }
        return result
    }

    var body: some View {
        let targetManwon = timeline.target / 10_000.0
        Chart {
            ForEach(items) { item in
                BarMark(x: .value("나이", item.age),
                        y: .value("만원", item.manwon))
                    .foregroundStyle(by: .value("연금", item.series))
            }
            RuleMark(y: .value("목표", targetManwon))
                .lineStyle(StrokeStyle(lineWidth: 2, dash: [6, 4]))
                .foregroundStyle(Color.red)
                .annotation(position: .top, alignment: .leading) {
                    Text("목표 \(MoneyFormat.manwon(timeline.target))")
                        .font(.caption)
                        .foregroundColor(.red)
                }
        }
        .chartForegroundStyleScale(domain: IncomeChartView.names, range: IncomeChartView.colors)
        .chartYAxisLabel("만원 (오늘 돈, 세전)")
        .chartXAxisLabel("나이")
        .frame(height: 280)
        .accessibilityLabel("나이별 월수입 누적 막대 차트. 같은 정보가 아래 표에 있어요.")
    }
}
