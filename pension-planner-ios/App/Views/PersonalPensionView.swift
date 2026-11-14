import SwiftUI
import PensionCore

struct PersonalPensionView: View {
    @EnvironmentObject var store: PlanStore

    var body: some View {
        let stream = PersonalPensionCalculator.calculate(input: store.plan.personal, common: store.plan.common)
        Form {
            Section {
                Toggle("이 연금 포함", isOn: $store.plan.personal.included)
            }
            if store.plan.personal.included {
                Section(header: Text("납입"), footer: Text(Notices.demoValues)) {
                    WonField(title: "현재 잔액", won: $store.plan.personal.currentBalance)
                    WonField(title: "월 납입액", won: $store.plan.personal.monthlyContribution)
                    Toggle("납입 종료를 은퇴 나이와 같게", isOn: $store.plan.personal.endSameAsRetirement)
                    if !store.plan.personal.endSameAsRetirement {
                        IntField(title: "납입 종료 나이", unit: "세", value: $store.plan.personal.contributionEndAge)
                    }
                    PercentField(title: "운용 수익률 (연)", rate: $store.plan.personal.accumulationReturn)
                }
                Section(header: Text("수령")) {
                    Toggle("수령 시작을 은퇴 나이와 같게", isOn: $store.plan.personal.startSameAsRetirement)
                    if !store.plan.personal.startSameAsRetirement {
                        IntField(title: "수령 시작 나이", unit: "세", value: $store.plan.personal.startAge)
                    }
                    IntField(title: "수령 기간", unit: "년", value: $store.plan.personal.payoutYears)
                    PercentField(title: "수령 중 수익률 (연)", rate: $store.plan.personal.payoutReturn)
                }
            }
            PayoutSummarySection(stream: stream, notes: [
                Notices.inflationLinked,
                "월 납입액은 지금부터 납입 종료 나이까지 매달 같은 금액(명목)을 낸다고 가정해요."
            ])
        }
        .navigationTitle("개인연금")
    }
}
