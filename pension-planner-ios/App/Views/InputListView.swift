import SwiftUI
import PensionCore

struct InputListView: View {
    @EnvironmentObject var store: PlanStore
    @State private var showResetConfirm = false

    private var common: CommonAssumptions { return store.plan.common }

    private func summary(_ stream: PensionStream, emptyText: String) -> String {
        if !stream.included { return "OFF" }
        if stream.hasErrors { return "입력 확인 필요" }
        if stream.realMonthly <= 0 { return emptyText }
        return "월 " + MoneyFormat.manwon(stream.realMonthly)
    }

    var body: some View {
        let ret = RetirementPensionCalculator.calculate(input: store.plan.retirement, common: common)
        let per = PersonalPensionCalculator.calculate(input: store.plan.personal, common: common)
        let hou = HousingPensionCalculator.calculate(input: store.plan.housing, common: common)
        let nat = NationalPensionCalculator.calculate(input: store.plan.national, common: common)

        NavigationStack {
            List {
                Section(footer: Text(Notices.demoValues)) {
                    NavigationLink(destination: CommonAssumptionsView()) {
                        row(title: "공통 가정",
                            detail: "현재 \(common.currentAge)세 / 은퇴 \(common.retirementAge)세 / 목표 \(MoneyFormat.manwon(common.targetMonthly))")
                    }
                    NavigationLink(destination: RetirementPensionView()) {
                        row(title: "퇴직연금 (DC/IRP)", detail: summary(ret, emptyText: "미입력"))
                    }
                    NavigationLink(destination: PersonalPensionView()) {
                        row(title: "개인연금", detail: summary(per, emptyText: "미입력"))
                    }
                    NavigationLink(destination: HousingPensionView()) {
                        row(title: "주택연금", detail: summary(hou, emptyText: "미입력"))
                    }
                    NavigationLink(destination: NationalPensionView()) {
                        row(title: "국민연금", detail: summary(nat, emptyText: "미입력"))
                    }
                }
                Section(header: Text("설정")) {
                    Button("모두 초기화", role: .destructive) {
                        showResetConfirm = true
                    }
                }
                Section {
                    Text(Notices.always).font(.footnote).foregroundColor(.secondary)
                }
            }
            .navigationTitle("연금 입력")
            .confirmationDialog("입력한 내용을 모두 지우고 예시값으로 되돌릴까요?",
                                isPresented: $showResetConfirm,
                                titleVisibility: .visible) {
                Button("모두 초기화", role: .destructive) {
                    store.resetAll()
                }
                Button("취소", role: .cancel) {}
            }
        }
    }

    private func row(title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
            Text(detail).font(.footnote).foregroundColor(.secondary)
        }
    }
}
