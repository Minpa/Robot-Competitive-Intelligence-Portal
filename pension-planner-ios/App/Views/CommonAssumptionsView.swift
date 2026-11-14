import SwiftUI
import PensionCore

struct CommonAssumptionsView: View {
    @EnvironmentObject var store: PlanStore

    var body: some View {
        let errors = Validation.commonErrors(store.plan.common)
        Form {
            Section(header: Text("나이"), footer: Text(Notices.demoValues)) {
                IntField(title: "현재 나이", unit: "세", value: $store.plan.common.currentAge)
                IntField(title: "은퇴 나이", unit: "세", value: $store.plan.common.retirementAge)
                IntField(title: "기대수명", unit: "세", value: $store.plan.common.lifeExpectancy)
            }
            Section(header: Text("물가와 목표")) {
                PercentField(title: "물가상승률 (연)", rate: $store.plan.common.inflationRate)
                WonField(title: "목표 월수입 (오늘 돈, 세전)", won: $store.plan.common.targetMonthly)
            }
            Section {
                MessageList(errors: errors, warnings: [])
                Text("목표는 오늘 돈 가치, 세전 기준이에요. 세금은 계산하지 않아요.")
                    .font(.footnote).foregroundColor(.secondary)
            }
        }
        .keyboardDoneToolbar()
        .navigationTitle("공통 가정")
    }
}
