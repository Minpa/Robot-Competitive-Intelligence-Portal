#!/usr/bin/env python3
"""SPEC 5절 산식의 독립 Python 구현 + 9절 기대값 재현 (표준 라이브러리만).

실행: python3 Tools/expected_values.py
손계산 값(T1, T3~T16, 통합 π=0)은 assert로 자체 검사하고,
Python으로 확정하는 값(T2, T17, 통합 π=2%, 은퇴 연기 표)은 출력한다.
Swift 테스트(Tests/PensionCoreTests)의 기대값은 이 출력에서 가져온다.
"""
import math

# ---------- 기본 함수 ----------
def D(a, cur, pi):
    return (1.0 + pi) ** (a - cur)

def fv(P, i, n):
    return P * (1.0 + i) ** n

def annuity_fv(c, i, n):
    if abs(i) < 1e-12:
        return c * n
    return c * ((1.0 + i) ** n - 1.0) / i

def pmt(B, i, n):
    if n <= 0:
        return 0.0
    if abs(i) < 1e-12:
        return B / n
    return B * i / (1.0 - (1.0 + i) ** (-n))

def payout_real(B_start, s, cur, pi, rp, life, years):
    """5.2 물가연동 수령. (오늘 돈 월액, 유효 수령년수)"""
    ny = min(years, life - s)
    if ny <= 0:
        return 0.0, 0
    B_real = B_start / D(s, cur, pi)
    j = (1.0 + rp / 12.0) / (1.0 + pi) ** (1.0 / 12.0) - 1.0
    return pmt(B_real, j, 12 * ny), ny

# ---------- 연금별 ----------
def retirement_balance(r, cur, R):
    if r["mode"] == "direct":
        return r["direct"]
    N = 12 * (R - cur)
    i = r["acc"] / 12.0
    bal = r["balance"]
    for m in range(N):
        bal = bal * (1.0 + i) + r["salary"] * (1.0 + r["g"]) ** (m // 12) * r["rate"] / 12.0
    return bal

def retirement_stream(r, c):
    """-> (start, ny, monthly_real, B_ret, B_start)"""
    if not r["on"]:
        return (0, 0, 0.0, 0.0, 0.0)
    R = c["R"]
    s = R if r["same"] else r["start"]
    B_ret = retirement_balance(r, c["cur"], R)
    B_start = fv(B_ret, r["acc"] / 12.0, 12 * (s - R))
    m, ny = payout_real(B_start, s, c["cur"], c["pi"], r["rp"], c["life"], r["years"])
    return (s, ny, m, B_ret, B_start)

def personal_stream(p, c):
    """-> (start, ny, monthly_real, B_c, B_start)"""
    if not p["on"]:
        return (0, 0, 0.0, 0.0, 0.0)
    R = c["R"]
    end = R if p["end_same"] else p["end"]
    s = R if p["start_same"] else p["start"]
    i = p["acc"] / 12.0
    nc = 12 * max(0, end - c["cur"])
    Bc = fv(p["balance"], i, nc) + annuity_fv(p["monthly"], i, nc)
    B_start = fv(Bc, i, 12 * (s - end))
    m, ny = payout_real(B_start, s, c["cur"], c["pi"], p["rp"], c["life"], p["years"])
    return (s, ny, m, Bc, B_start)

def housing_first_payment(h, c, join):
    if h["mode"] == "direct":
        return h["direct"]
    H = h["price"] * (1.0 + h["growth"]) ** max(0, join - c["cur"])
    Hc = min(H, h["cap"]) if h["cap"] > 0 else H
    per = h["table"].get(join)
    if per is None:
        return None
    return Hc / 1e8 * per

def housing_stream(h, c):
    """-> (join, monthly_real) ; 표에 나이 없으면 monthly=None"""
    if not h["on"]:
        return (0, 0.0)
    join = c["R"] if h["same"] else h["join"]
    P = housing_first_payment(h, c, join)
    if P is None:
        return (join, None)
    return (join, P)  # v1.1: 명목 고정액 P (오늘 돈 월액은 나이별로 P/D(a))

def timeline(plan):
    c = plan["c"]
    rs, rny, rm, _, _ = retirement_stream(plan["ret"], c)
    ps, pny, pm, _, _ = personal_stream(plan["per"], c)
    hj, hm = housing_stream(plan["hou"], c)
    n = plan["nat"]
    rows = {}
    for a in range(c["R"], c["life"]):
        v_r = rm if (rny > 0 and rs <= a < rs + rny) else 0.0
        v_p = pm if (pny > 0 and ps <= a < ps + pny) else 0.0
        v_h = hm / D(a, c["cur"], c["pi"]) if (plan["hou"]["on"] and a >= hj and hm is not None) else 0.0
        v_n = n["monthly"] if (n["on"] and a >= n["start"]) else 0.0
        tot = v_r + v_p + v_h + v_n
        rows[a] = (v_r, v_p, v_h, v_n, tot, max(0.0, c["target"] - tot))
    return rows

def segments(rows):
    """부족>0 이고 연금 구성(활성 여부)이 같은 연속 나이 묶음 (주택연금이 나이별로 변하므로 평균/최대가 다를 수 있음)."""
    segs = []
    cur = None
    for a in sorted(rows):
        r = rows[a]
        key = tuple(x > 0 for x in r[:4])
        sh = r[5]
        if sh > 0.5:
            if cur and cur["key"] == key and cur["end"] == a - 1:
                cur["end"] = a
                cur["vals"].append(sh)
            else:
                cur = {"start": a, "end": a, "key": key, "vals": [sh]}
                segs.append(cur)
        else:
            cur = None
    for s in segs:
        s["avg"] = sum(s["vals"]) / len(s["vals"])
        s["max"] = max(s["vals"])
    return segs

def max_shortfall(rows):
    return max(r[5] for r in rows.values())

def fill(plan):
    """U6: 개인연금 지급 구간 W의 최대 부족액 Δ를 메우는 추가 월 납입(원)."""
    c = plan["c"]
    rows = timeline(plan)
    probe = dict(plan["per"], on=True, balance=0.0, monthly=1.0)
    ps, pny, p1, _, _ = personal_stream(probe, c)
    W = [a for a in rows if pny > 0 and ps <= a < ps + pny and p1 > 0]
    if not W:
        return None
    delta = max(rows[a][5] for a in W)
    uncovered = [a for a in rows if rows[a][5] > 0.5 and a not in W]
    return {"W": (min(W), max(W)), "delta": delta, "p1": p1, "extra": delta / p1, "uncovered": uncovered}

def postpone(plan, k):
    c = dict(plan["c"], R=plan["c"]["R"] + k)
    if c["life"] <= c["R"]:
        return None
    r = dict(plan["ret"])
    r["start"] = max(c["R"], r["start"]) if not r["same"] else c["R"]
    r["same"] = False
    p = dict(plan["per"])
    end = c["R"] if p["end_same"] else max(p["end"], c["R"])
    st = c["R"] if p["start_same"] else max(p["start"], c["R"])
    st = max(st, end)
    p.update(end=end, start=st, end_same=False, start_same=False)
    h = dict(plan["hou"])
    if h["same"]:
        h["join"] = c["R"]
        h["same"] = False
    new = dict(plan, c=c, ret=r, per=p, hou=h)
    rows = timeline(new)
    return c["R"], max_shortfall(rows), max_shortfall(rows) <= 0.5

# ---------- 기본 입력 ----------
def base_c(cur=50, R=60, life=90, pi=0.0, target=5_000_000.0):
    return dict(cur=cur, R=R, life=life, pi=pi, target=target)

def ret_t1(**kw):
    d = dict(on=True, mode="calc", balance=1e8, salary=6e7, g=0.0, rate=1.0 / 12.0, acc=0.0,
             same=True, start=60, years=20, rp=0.0, direct=0.0)
    d.update(kw)
    return d

def per_t5(**kw):
    d = dict(on=True, balance=0.0, monthly=500_000.0, end_same=True, end=60, acc=0.0,
             start_same=True, start=60, years=20, rp=0.0)
    d.update(kw)
    return d

def hou_off(**kw):
    d = dict(on=False, mode="direct", same=True, join=60, direct=0.0, price=0.0, growth=0.0,
             cap=0.0, table={})
    d.update(kw)
    return d

def nat_off(**kw):
    d = dict(on=False, monthly=0.0, start=65)
    d.update(kw)
    return d

def integrated(pi):
    return dict(c=base_c(pi=pi), ret=ret_t1(),
                per=per_t5(),
                hou=hou_off(on=True, direct=1_000_000.0),
                nat=nat_off(on=True, monthly=1_200_000.0, start=65))

def near(a, b, tol, label):
    assert abs(a - b) <= tol, "%s: %r != %r (tol %r)" % (label, a, b, tol)
    print("  ok %-34s %16.4f (기대 %.4f ±%g)" % (label, a, b, tol))

def main():
    print("== 손계산 값 자체 검사 ==")
    c = base_c()
    # T1
    s, ny, m, Bret, _ = retirement_stream(ret_t1(), c)
    near(Bret, 150_000_000, 1, "T1 B_ret", ); near(m, 625_000, 1, "T1 월액")
    # T3
    c3 = base_c(cur=58, R=60)
    s, ny, m, Bret, _ = retirement_stream(ret_t1(balance=0.0, g=0.10, years=1), c3)
    near(Bret, 10_500_000, 1, "T3 B_ret"); near(m, 875_000, 1, "T3 월액")
    # T4
    s, ny, m, Bret, _ = retirement_stream(ret_t1(rate=0.0, acc=0.06), c)
    near(Bret, 181_939_670, 1000, "T4 B_ret"); near(m, 758_082, 50, "T4 월액")
    print("   (T4 정확값 B_ret=%.2f 월=%.2f)" % (Bret, m))
    # T5, T6, T7
    s, ny, m, Bc, _ = personal_stream(per_t5(), c)
    near(Bc, 60_000_000, 1, "T5 적립"); near(m, 250_000, 1, "T5 월액")
    s, ny, m, Bc, _ = personal_stream(per_t5(acc=0.06), c)
    near(Bc, 81_939_670, 1000, "T6 적립"); near(m, 341_415, 10, "T6 월액")
    print("   (T6 정확값 적립=%.2f 월=%.2f)" % (Bc, m))
    s, ny, m, Bc, _ = personal_stream(per_t5(acc=0.06, rp=0.06), c)
    near(m, 587_042, 300, "T7 월액"); print("   (T7 정확값 %.4f)" % m)
    # T8
    plan8 = dict(c=base_c(), ret=ret_t1(on=False), per=per_t5(on=False),
                 hou=hou_off(on=True, direct=1_000_000.0), nat=nat_off())
    rows = timeline(plan8)
    assert all(abs(rows[a][2] - 1_000_000) < 1e-6 for a in range(60, 90)); print("  ok T8 60~89세 1,000,000 (π=0)")
    # T9, T10 (테스트용 가상 예시값)
    h9 = hou_off(on=True, mode="est", price=6e8, growth=0.0, cap=12e8, table={60: 250_000.0})
    near(housing_first_payment(h9, c, 60), 1_500_000, 1, "T9 주택(b)")
    near(housing_first_payment(dict(h9, price=20e8), c, 60), 3_000_000, 1, "T10 주택 20억")
    # T11
    assert housing_first_payment(dict(h9, table={}), c, 60) is None; print("  ok T11 표에 나이 없음 -> 오류(None)")
    # T12
    plan12 = dict(c=base_c(pi=0.02), ret=ret_t1(on=False), per=per_t5(on=False), hou=hou_off(),
                  nat=nat_off(on=True, monthly=1_200_000.0, start=65))
    rows = timeline(plan12)
    assert all(rows[a][3] == 0 for a in range(60, 65)) and all(rows[a][3] == 1_200_000 for a in range(65, 90))
    print("  ok T12 국민연금 65세+ 1,200,000")
    # T13
    def manwon(w):
        return "%d만원" % math.floor(w / 10000.0 + 0.5)
    for w, e in [(3_125_000, "313만원"), (5_000_000, "500만원"), (0, "0만원"), (4_999, "0만원"), (625_000, "63만원")]:
        assert manwon(w) == e, (w, manwon(w), e)
    print("  ok T13 금액 표기")
    # T14
    near(retirement_stream(ret_t1(rp=0.0), c)[2], 625_000, 1e-6, "T14 수익률0")
    # T15
    s, ny, m, _, _ = retirement_stream(ret_t1(balance=0.0, salary=0.0, direct=1.2e8, mode="direct", start=80, same=False), c)
    assert ny == 10; near(m, 1_000_000, 1, "T15 유효10년 월액")
    # T16
    s, ny, m, _, _ = retirement_stream(ret_t1(start=90, same=False), c)
    assert ny == 0 and m == 0; print("  ok T16 수령시작=기대수명 -> 0")

    print("\n== Python으로 확정하는 값 ==")
    c2 = base_c(pi=0.02)
    s, ny, m, Bret, Bs = retirement_stream(ret_t1(), c2)
    print("T2  R = %.4f (B_real=%.4f, j=%.10f)" % (m, 1.5e8 / 1.02 ** 10, 1.0 / 1.02 ** (1 / 12) - 1))
    T2 = m
    near(T2, 625_000 * 0 + pmt(1.5e8 / 1.02 ** 10, 1.0 / 1.02 ** (1 / 12) - 1, 240), 1e-6, "T2 재계산 일치")
    plan17 = dict(c=base_c(pi=0.02), ret=ret_t1(on=False), per=per_t5(on=False),
                  hou=hou_off(on=True, direct=1_000_000.0), nat=nat_off())
    rows = timeline(plan17)
    for a in (60, 61, 70, 80, 89):
        print("T17 주택 %d세 월액 = %.4f" % (a, rows[a][2]))
    for a in range(60, 90):
        near(rows[a][2], 1_000_000 / 1.02 ** (a - 50), 1e-6, "T17 %d세" % a) if a in (60, 89) else None
        assert abs(rows[a][2] - 1_000_000 / 1.02 ** (a - 50)) < 1e-6
    near(rows[60][2], 820_348, 5, "T17 명세값 60세 820,348")
    assert all(rows[a][2] > rows[a + 1][2] for a in range(60, 89)); assert rows[59 if 59 in rows else 60][2] > 0

    print("\n== 통합 π=0 (손계산 검사) ==")
    plan0 = integrated(0.0)
    rows = timeline(plan0)
    exp = {range(60, 65): (1_875_000, 3_125_000), range(65, 80): (3_075_000, 1_925_000), range(80, 90): (2_200_000, 2_800_000)}
    for rg, (tot, sh) in exp.items():
        for a in rg:
            assert abs(rows[a][4] - tot) < 1e-6 and abs(rows[a][5] - sh) < 1e-6, a
    print("  ok 60~64 합1,875,000/부족3,125,000 | 65~79 3,075,000/1,925,000 | 80~89 2,200,000/2,800,000")
    segs = segments(rows)
    print("  구간:", [(s["start"], s["end"], round(s["max"])) for s in segs])
    assert [(s["start"], s["end"]) for s in segs] == [(60, 64), (65, 79), (80, 89)]
    worst = max(segs, key=lambda s: s["max"]); best = min(segs, key=lambda s: s["max"])
    print("  가장 부족: %d~%d (%d), 가장 덜 부족: %d~%d (%d)" % (worst["start"], worst["end"], worst["max"], best["start"], best["end"], best["max"]))
    assert (worst["start"], worst["end"]) == (60, 64) and (best["start"], best["end"]) == (65, 79)
    f = fill(plan0)
    print("  메우기:", f)
    assert f["W"] == (60, 79) and abs(f["delta"] - 3_125_000) < 1e-6 and abs(f["p1"] - 0.5) < 1e-9
    assert abs(f["extra"] - 6_250_000) < 1e-3 and f["uncovered"] == list(range(80, 90))
    print("\n  [은퇴 연기 표 π=0]")
    for k in range(1, 6):
        print("   +%d -> 은퇴 %d세, 최대 부족 %.4f, 달성 %s" % ((k,) + postpone(plan0, k)))

    print("\n== 통합 π=2% 변형 (Python 확정) ==")
    plan2 = integrated(0.02)
    rows = timeline(plan2)
    for a in (60, 64, 65, 79, 80, 89):
        r = rows[a]
        print("  %d세: 퇴직 %.4f 개인 %.4f 주택 %.4f 국민 %.4f 합계 %.4f 부족 %.4f" % ((a,) + r))
    segs = segments(rows)
    print("  구간:", [(s["start"], s["end"], round(s["max"], 4), round(s["avg"], 4)) for s in segs])
    f2 = fill(plan2)
    print("  메우기: W=%s Δ=%.4f p1=%.10f 추가월납입=%.4f 미충족=%s" % (f2["W"], f2["delta"], f2["p1"], f2["extra"], (min(f2["uncovered"]), max(f2["uncovered"]))))
    print("\n  [은퇴 연기 표 π=2%]")
    for k in range(1, 6):
        print("   +%d -> 은퇴 %d세, 최대 부족 %.4f, 달성 %s" % ((k,) + postpone(plan2, k)))
    print("\n== 모든 자체 assert 통과 ==")

if __name__ == "__main__":
    main()
