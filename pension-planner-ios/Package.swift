// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PensionCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "PensionCore", targets: ["PensionCore"])
    ],
    targets: [
        .target(name: "PensionCore", path: "Sources/PensionCore"),
        .testTarget(name: "PensionCoreTests", dependencies: ["PensionCore"], path: "Tests/PensionCoreTests")
    ]
)
