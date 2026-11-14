import Foundation

/// 월 수령액 계산 결과
public struct PayoutResult: Equatable {
    /// 오늘 돈 가치 월 수령액(원)
    public var realMonthly: Double
    /// 유효 수령 년수(기대수명 때문에 줄어든 값)
    public var effectiveYears: Int

    public init(realMonthly: Double, effectiveYears: Int) {
        self.realMonthly = realMonthly
        self.effectiveYears = effectiveYears
    }
}

public enum Finance {
    /// |i| 가 이 값보다 작으면 이율 0으로 취급
    public static let zeroRateEpsilon: Double = 1e-12

    /// fv(P,i,n) = P(1+i)^n
    public static func fv(_ principal: Double, _ monthlyRate: Double, _ months: Int) -> Double {
        if months <= 0 { return principal }
        return principal * pow(1.0 + monthlyRate, Double(months))
    }

    /// annuityFV(c,i,n) = c((1+i)^n - 1)/i, i=0 이면 c*n
    public static func annuityFV(_ contribution: Double, _ monthlyRate: Double, _ months: Int) -> Double {
        if months <= 0 { return 0 }
        if abs(monthlyRate) < zeroRateEpsilon {
            return contribution * Double(months)
        }
        return contribution * (pow(1.0 + monthlyRate, Double(months)) - 1.0) / monthlyRate
    }

    /// pmt(B,i,n) = B*i/(1-(1+i)^(-n)), i=0 이면 B/n
    public static func pmt(_ balance: Double, _ monthlyRate: Double, _ months: Int) -> Double {
        if months <= 0 { return 0 }
        if abs(monthlyRate) < zeroRateEpsilon {
            return balance / Double(months)
        }
        return balance * monthlyRate / (1.0 - pow(1.0 + monthlyRate, -Double(months)))
    }

    /// 할인계수 D(a) = (1+π)^(a - 현재나이)
    public static func discountFactor(age: Int, currentAge: Int, inflation: Double) -> Double {
        return pow(1.0 + inflation, Double(age - currentAge))
    }

    /// 5.2 물가연동 수령: 오늘 돈 가치 월 수령액.
    /// - Parameters:
    ///   - balanceAtStart: 수령 시작 시점 적립금(명목)
    public static func realMonthlyPayout(balanceAtStart: Double,
                                         startAge: Int,
                                         currentAge: Int,
                                         inflation: Double,
                                         payoutReturn: Double,
                                         payoutYears: Int,
                                         lifeExpectancy: Int) -> PayoutResult {
        let years = min(payoutYears, lifeExpectancy - startAge)
        if years <= 0 {
            return PayoutResult(realMonthly: 0, effectiveYears: 0)
        }
        let d = discountFactor(age: startAge, currentAge: currentAge, inflation: inflation)
        let balanceReal = balanceAtStart / d
        let j = (1.0 + payoutReturn / 12.0) / pow(1.0 + inflation, 1.0 / 12.0) - 1.0
        let monthly = pmt(balanceReal, j, 12 * years)
        return PayoutResult(realMonthly: monthly, effectiveYears: years)
    }
}
