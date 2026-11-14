import Foundation

/// 앱 전체 입력. UserDefaults에 JSON 1덩어리로 저장된다(키 plan.v1).
public struct PlanInput: Codable, Equatable {
    public static let currentSchemaVersion = 1

    public var schemaVersion: Int
    public var common: CommonAssumptions
    public var retirement: RetirementPensionInput
    public var personal: PersonalPensionInput
    public var housing: HousingPensionInput
    public var national: NationalPensionInput

    public init(schemaVersion: Int = PlanInput.currentSchemaVersion,
                common: CommonAssumptions = CommonAssumptions(),
                retirement: RetirementPensionInput = RetirementPensionInput(),
                personal: PersonalPensionInput = PersonalPensionInput(),
                housing: HousingPensionInput = HousingPensionInput(),
                national: NationalPensionInput = NationalPensionInput()) {
        self.schemaVersion = schemaVersion
        self.common = common
        self.retirement = retirement
        self.personal = personal
        self.housing = housing
        self.national = national
    }

    private enum CodingKeys: String, CodingKey {
        case schemaVersion, common, retirement, personal, housing, national
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.schemaVersion = try c.decodeIfPresent(Int.self, forKey: .schemaVersion) ?? PlanInput.currentSchemaVersion
        self.common = try c.decodeIfPresent(CommonAssumptions.self, forKey: .common) ?? CommonAssumptions()
        self.retirement = try c.decodeIfPresent(RetirementPensionInput.self, forKey: .retirement) ?? RetirementPensionInput()
        self.personal = try c.decodeIfPresent(PersonalPensionInput.self, forKey: .personal) ?? PersonalPensionInput()
        self.housing = try c.decodeIfPresent(HousingPensionInput.self, forKey: .housing) ?? HousingPensionInput()
        self.national = try c.decodeIfPresent(NationalPensionInput.self, forKey: .national) ?? NationalPensionInput()
    }
}
