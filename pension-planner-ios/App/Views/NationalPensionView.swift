import SwiftUI
import PensionCore

struct NationalPensionView: View {
    @EnvironmentObject var store: PlanStore

    var body: some View {
        let stream = NationalPensionCalculator.calculate(input: store.plan.national, common: store.plan.common)
        Form {
            Section {
                Toggle("이 연금 포함", isOn: $store.plan.national.included)
            }
            if store.plan.national.included {
                Section(header: Text("국민연금 예상 수령액"), footer: Text(Notices.demoValues)) {
                    WonField(title: "월 예상 수령액 (오늘 돈 가치)", won: $store.plan.national.monthlyAmount)
                    IntField(title: "수령 시작 나이", unit: "세", value: $store.plan.national.startAge)
                }
            }
            Section(header: Text("예상 월수령액 (오늘 돈 가치, 세전)")) {
                if !stream.included {
                    Text("이 연금은 계산에서 빠져 있어요.").foregroundColor(.secondary)
                } else if stream.hasErrors {
                    Text("계산할 수 없음").foregroundColor(.red)
                } else if stream.realMonthly <= 0 {
                    Text("미입력").foregroundColor(.secondary)
                } else {
                    Text(MoneyFormat.manwon(stream.realMonthly)).font(.title2).bold()
                }
                MessageList(errors: stream.errors, warnings: stream.warnings)
                Text("국민연금공단 예상 수령액 조회 값을 오늘 돈 가치로 입력하세요. 물가만큼 늘어난다고 가정해서 입력값을 그대로 씁니다.")
                    .font(.footnote).foregroundColor(.secondary)
            }
        }
        .navigationTitle("국민연금")
    }
}
