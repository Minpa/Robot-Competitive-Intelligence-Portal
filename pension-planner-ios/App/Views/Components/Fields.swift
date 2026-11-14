import SwiftUI
import UIKit
import PensionCore

extension View {
    /// 숫자 키보드(return 키 없음) 위에 "완료" 버튼을 붙여 포커스를 해제한다.
    /// 포커스를 잃어야 TextField(value:format:)의 값이 반영된다.
    func keyboardDoneToolbar() -> some View {
        return self.toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("완료") {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder),
                                                    to: nil, from: nil, for: nil)
                }
            }
        }
    }
}

/// 만원 단위 금액 입력(내부 값은 원)
struct WonField: View {
    let title: String
    @Binding var won: Double

    var body: some View {
        let manwon = Binding<Double>(
            get: { won / 10_000.0 },
            set: { newValue in won = max(0, newValue) * 10_000.0 }
        )
        HStack {
            Text(title)
            Spacer()
            TextField("0", value: manwon, format: .number)
                .multilineTextAlignment(.trailing)
                .keyboardType(.decimalPad)
                .frame(maxWidth: 140)
            Text("만원").foregroundColor(.secondary)
        }
    }
}

/// % 단위 비율 입력(내부 값은 소수, 0.02 = 2%)
struct PercentField: View {
    let title: String
    @Binding var rate: Double

    var body: some View {
        let percent = Binding<Double>(
            get: { rate * 100.0 },
            set: { newValue in rate = newValue / 100.0 }
        )
        HStack {
            Text(title)
            Spacer()
            TextField("0", value: percent, format: .number)
                .multilineTextAlignment(.trailing)
                .keyboardType(.numbersAndPunctuation)
                .frame(maxWidth: 140)
            Text("%").foregroundColor(.secondary)
        }
    }
}

/// 정수 입력(나이, 년수 등)
struct IntField: View {
    let title: String
    let unit: String
    @Binding var value: Int

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            TextField("0", value: $value, format: .number)
                .multilineTextAlignment(.trailing)
                .keyboardType(.numberPad)
                .frame(maxWidth: 140)
            Text(unit).foregroundColor(.secondary)
        }
    }
}

/// 오류(빨강)/경고(주황) 목록
struct MessageList: View {
    let errors: [String]
    let warnings: [String]

    var body: some View {
        ForEach(Array(errors.enumerated()), id: \.offset) { item in
            Text(item.element).foregroundColor(.red).font(.footnote)
        }
        ForEach(Array(warnings.enumerated()), id: \.offset) { item in
            Text(item.element).foregroundColor(.orange).font(.footnote)
        }
    }
}

/// 폼 하단: 예상 월수령액(오늘 돈) + 안내 + 오류/경고
struct PayoutSummarySection: View {
    let stream: PensionStream
    let notes: [String]

    var body: some View {
        Section(header: Text("예상 월수령액 (오늘 돈 가치, 세전)")) {
            if !stream.included {
                Text("이 연금은 계산에서 빠져 있어요.").foregroundColor(.secondary)
            } else if stream.hasErrors {
                Text("계산할 수 없음").foregroundColor(.red)
            } else {
                Text(MoneyFormat.manwon(stream.realMonthly))
                    .font(.title2).bold()
                if stream.realMonthly > 0 {
                    Text("\(stream.startAge)세부터 받는 첫 달 명목 금액은 약 \(MoneyFormat.manwon(stream.nominalFirstMonthly))이에요.")
                        .font(.footnote).foregroundColor(.secondary)
                }
            }
            MessageList(errors: stream.errors, warnings: stream.warnings)
            ForEach(Array(notes.enumerated()), id: \.offset) { item in
                Text(item.element).font(.footnote).foregroundColor(.secondary)
            }
        }
    }
}

enum Notices {
    static let demoValues = "처음 들어 있는 숫자는 모두 시연용 예시값이에요. 본인의 실제 값으로 바꿔 주세요."
    static let always = "세전, 오늘 돈 가치 기준 추정치이며 실제와 다를 수 있습니다. 퇴직·개인연금은 물가만큼 늘어나고, 주택연금은 고정액이라고 가정했습니다."
    static let housing = "정액형 기준으로 매달 같은 금액을 받는다고 가정했습니다. 물가가 오르면 오늘 돈 가치로는 점점 줄어듭니다. 정확한 값은 한국주택금융공사 예상연금 조회를 권장합니다."
    static let inflationLinked = "받는 동안 물가만큼 늘어난다고 가정해서, 오늘 돈 가치 월액은 받는 기간 내내 같아요."
}
