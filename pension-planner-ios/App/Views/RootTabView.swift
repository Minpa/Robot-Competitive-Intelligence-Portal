import SwiftUI
import PensionCore

struct RootTabView: View {
    var body: some View {
        TabView {
            InputListView()
                .tabItem { Label("입력", systemImage: "square.and.pencil") }
            ResultView()
                .tabItem { Label("결과", systemImage: "chart.bar.xaxis") }
        }
    }
}
