import SwiftUI
import PensionCore

struct RetirementPensionView: View {
    @EnvironmentObject var store: PlanStore

    var body: some View {
        let stream = RetirementPensionCalculator.calculate(input: store.plan.retirement, common: store.plan.common)
        Form {
            Section {
                Toggle("이 연금 포함", isOn: $store.plan.retirement.included)
            }
            if store.plan.retirement.included {
                Section(header: Text("입력 방식"), footer: Text(Notices.demoValues)) {
                    Picker("방식", selection: $store.plan.retirement.mode) {
                        Text("DC/IRP 계산").tag(RetirementInputMode.calculate)
                        Text("은퇴 시점 적립금 입력").tag(RetirementInputMode.direct)
                    }
                    .pickerStyle(.segmented)
                }
                if store.plan.retirement.mode == .calculate {
                    Section(header: Text("적립 (은퇴할 때까지)")) {
                        WonField(title: "현재 적립금", won: $store.plan.retirement.currentBalance)
                        WonField(title: "연봉 (세전)", won: $store.plan.retirement.annualSalary)
                        PercentField(title: "연봉 상승률 (연)", rate: $store.plan.retirement.salaryGrowthRate)
                        PercentField(title: "연간 적립률 (연봉 대비)", rate: $store.plan.retirement.contributionRate)
                        PercentField(title: "적립 중 수익률 (연)", rate: $store.plan.retirement.accumulationReturn)
                    }
                } else {
                    Section(header: Text("은퇴 시점 적립금")) {
                        WonField(title: "은퇴 시점 적립금 (명목)", won: $store.plan.retirement.directBalanceAtRetirement)
                        PercentField(title: "수령 시작 전 수익률 (연)", rate: $store.plan.retirement.accumulationReturn)
                    }
                }
                Section(header: Text("수령")) {
                    Toggle("은퇴 나이와 같게", isOn: $store.plan.retirement.startSameAsRetirement)
                    if !store.plan.retirement.startSameAsRetirement {
                        IntField(title: "수령 시작 나이", unit: "세", value: $store.plan.retirement.startAge)
                    }
                    IntField(title: "수령 기간", unit: "년", value: $store.plan.retirement.payoutYears)
                    PercentField(title: "수령 중 수익률 (연)", rate: $store.plan.retirement.payoutReturn)
                }
            }
            PayoutSummarySection(stream: stream, notes: [
                Notices.inflationLinked,
                "연금 수령액은 단순화한 계산이며 실제 상품 조건과 다를 수 있어요."
            ])
        }
        .navigationTitle("퇴직연금")
    }
}
