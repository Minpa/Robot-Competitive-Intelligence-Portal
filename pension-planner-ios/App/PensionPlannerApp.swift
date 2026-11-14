import SwiftUI
import PensionCore

@main
struct PensionPlannerApp: App {
    @StateObject private var store = PlanStore()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
        }
    }
}
