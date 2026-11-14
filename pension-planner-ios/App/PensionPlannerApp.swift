import SwiftUI
import PensionCore

@main
struct PensionPlannerApp: App {
    @StateObject private var store = PlanStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase != .active {
                        store.saveNow()
                    }
                }
        }
    }
}
