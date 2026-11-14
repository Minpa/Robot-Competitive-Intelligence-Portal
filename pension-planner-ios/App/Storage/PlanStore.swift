import Foundation
import Combine
import PensionCore

/// 입력 전체를 들고 있는 저장소. 입력이 바뀌면 0.5초 뒤 UserDefaults에 JSON 1덩어리로 저장한다.
final class PlanStore: ObservableObject {
    static let storageKey = "plan.v1"

    @Published var plan: PlanInput

    private var cancellable: AnyCancellable?

    init() {
        self.plan = PlanStore.load()
        cancellable = $plan
            .dropFirst()
            .debounce(for: .seconds(0.5), scheduler: DispatchQueue.main)
            .sink { value in
                PlanStore.save(value)
            }
    }

    static func load() -> PlanInput {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return PlanInput()
        }
        do {
            return try JSONDecoder().decode(PlanInput.self, from: data)
        } catch {
            return PlanInput()
        }
    }

    static func save(_ plan: PlanInput) {
        do {
            let data = try JSONEncoder().encode(plan)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            // 저장 실패는 조용히 무시(다음 변경 때 다시 시도)
        }
    }

    /// 즉시 저장(앱이 비활성/백그라운드로 갈 때)
    func saveNow() {
        PlanStore.save(plan)
    }

    /// 모두 초기화: 저장값 삭제 + 기본(시연용 예시)값으로 복귀
    func resetAll() {
        UserDefaults.standard.removeObject(forKey: PlanStore.storageKey)
        plan = PlanInput()
    }
}
