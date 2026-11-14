import SwiftUI
import PensionCore

struct HousingPensionView: View {
    @EnvironmentObject var store: PlanStore

    var body: some View {
        let stream = HousingPensionCalculator.calculate(input: store.plan.housing, common: store.plan.common)
        Form {
            Section {
                Toggle("이 연금 포함", isOn: $store.plan.housing.included)
            }
            if store.plan.housing.included {
                Section(header: Text("입력 방식"), footer: Text(Notices.demoValues)) {
                    Picker("방식", selection: $store.plan.housing.mode) {
                        Text("공사 조회값 입력").tag(HousingInputMode.direct)
                        Text("대략 추정").tag(HousingInputMode.estimate)
                    }
                    .pickerStyle(.segmented)
                    Toggle("가입 나이를 은퇴 나이와 같게", isOn: $store.plan.housing.joinSameAsRetirement)
                    if !store.plan.housing.joinSameAsRetirement {
                        IntField(title: "가입(수령 시작) 나이", unit: "세", value: $store.plan.housing.joinAge)
                    }
                }
                if store.plan.housing.mode == .direct {
                    Section(header: Text("공사 예상연금 조회값")) {
                        WonField(title: "가입 시점 첫 월지급액 (명목)", won: $store.plan.housing.directMonthlyPayment)
                    }
                } else {
                    estimateSections
                }
            }
            PayoutSummarySection(stream: stream, notes: [Notices.housing])
        }
        .keyboardDoneToolbar()
        .navigationTitle("주택연금")
    }

    @ViewBuilder
    private var estimateSections: some View {
        Section(header: Text("주택")) {
            WonField(title: "현재 주택가격", won: $store.plan.housing.currentHomePrice)
            PercentField(title: "주택가격 상승률 (연)", rate: $store.plan.housing.homePriceGrowthRate)
        }
        Section(header: Text("가격표 (직접 입력)"),
                footer: Text("이 앱에는 실제 지급액 표가 들어 있지 않아요. 한국주택금융공사 자료를 보고 직접 입력해야 하고, 값이 없는 나이는 계산하지 않아요(보간 없음). 확인할 수 없으면 '공사 조회값 입력' 방식을 권장해요.")) {
            WonField(title: "주택가격 상한", won: $store.plan.housing.priceTable.priceCap)
            ForEach($store.plan.housing.priceTable.rows) { $row in
                HStack {
                    IntField(title: "나이", unit: "세", value: $row.age)
                    WonField(title: "1억당 월", won: $row.monthlyPer100M)
                }
            }
            .onDelete { offsets in
                store.plan.housing.priceTable.rows.remove(atOffsets: offsets)
            }
            Button("나이 추가") {
                store.plan.housing.priceTable.rows.append(HousingPriceRow(age: store.plan.common.retirementAge, monthlyPer100M: 0))
            }
        }
        Section(header: Text("가격표 출처 정보")) {
            HStack {
                Text("출처")
                TextField("확인할 수 없음", text: $store.plan.housing.priceTable.source)
                    .multilineTextAlignment(.trailing)
            }
            HStack {
                Text("기준일")
                TextField("확인할 수 없음", text: $store.plan.housing.priceTable.asOfDate)
                    .multilineTextAlignment(.trailing)
            }
            Picker("신뢰도", selection: $store.plan.housing.priceTable.confidence) {
                ForEach(["A", "B", "C", "D", "E", "F"], id: \.self) { grade in
                    Text(grade).tag(grade)
                }
            }
            if store.plan.housing.priceTable.source == HousingPriceTable.unknownText {
                Text("출처를 확인할 수 없는 표예요. 결과는 참고용으로만 보세요.")
                    .font(.footnote).foregroundColor(.orange)
            }
        }
    }
}
