import { describe, expect, it } from "vitest";
import {
  calculateMonthlySummary,
  calculateSettlement,
  round2,
  type MonthlyCalculationInput,
} from "../src/lib/calculations";

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(1.005)).toBeCloseTo(1.01, 2);
    expect(round2(7500 / 92)).toBeCloseTo(81.52, 2);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("calculateMonthlySummary", () => {
  it("matches the shape of the worked example from the spec (all expenses meal-related)", () => {
    // Same costs/paid/balances as the spec's illustrative example (Sk Moni:
    // Cost 7500, Paid 10000 -> Receive 2500; Taufiq: Cost 7200, Paid 4700 ->
    // Due 2500), but with meal counts chosen so the numbers are exact: the
    // spec's own 92/88 meals don't divide 14700 evenly (92 * (14700/180) =
    // 7513.33, not 7500) — that example was illustrative, not penny-exact.
    // Here mealCost is a clean ৳75/meal: 100 meals for Moni, 96 for Taufiq.
    const input: MonthlyCalculationInput = {
      people: [
        { userId: "moni", mealCount: 100, guestMealCount: 0 },
        { userId: "taufiq", mealCount: 96, guestMealCount: 0 },
      ],
      payments: [
        { userId: "moni", totalPaid: 10000 },
        { userId: "taufiq", totalPaid: 4700 },
      ],
      mealExpenseTotal: 14700,
      otherExpenseTotal: 0,
      activeUserCount: 2,
    };

    const summary = calculateMonthlySummary(input);

    expect(summary.totalMeals).toBe(196);
    expect(summary.mealCost).toBeCloseTo(75, 2);

    const moni = summary.people.find((p) => p.userId === "moni")!;
    const taufiq = summary.people.find((p) => p.userId === "taufiq")!;

    expect(moni.personalMealCost).toBeCloseTo(7500, 2);
    expect(taufiq.personalMealCost).toBeCloseTo(7200, 2);
    expect(moni.balance).toBeCloseTo(2500, 2);
    expect(taufiq.balance).toBeCloseTo(-2500, 2);
  });

  it("keeps personal meal costs proportional and summing to the total, even when the per-meal rate doesn't divide evenly", () => {
    // This is the spec's literal 92/88 meal split — verifies the engine
    // distributes cost proportionally to meals eaten and that balances still
    // net to zero, without asserting artificially round output numbers.
    const input: MonthlyCalculationInput = {
      people: [
        { userId: "moni", mealCount: 92, guestMealCount: 0 },
        { userId: "taufiq", mealCount: 88, guestMealCount: 0 },
      ],
      payments: [
        { userId: "moni", totalPaid: 10000 },
        { userId: "taufiq", totalPaid: 4700 },
      ],
      mealExpenseTotal: 14700,
      otherExpenseTotal: 0,
      activeUserCount: 2,
    };

    const summary = calculateMonthlySummary(input);
    const moni = summary.people.find((p) => p.userId === "moni")!;
    const taufiq = summary.people.find((p) => p.userId === "taufiq")!;

    expect(summary.totalMeals).toBe(180);
    expect(round2(moni.personalMealCost + taufiq.personalMealCost)).toBeCloseTo(14700, 1);
    expect(moni.personalMealCost).toBeGreaterThan(taufiq.personalMealCost);
    expect(round2(moni.balance + taufiq.balance)).toBeCloseTo(0, 1);
  });

  it("bills guest meals to whichever person hosted them", () => {
    const input: MonthlyCalculationInput = {
      people: [
        { userId: "a", mealCount: 10, guestMealCount: 5 },
        { userId: "b", mealCount: 10, guestMealCount: 0 },
      ],
      payments: [
        { userId: "a", totalPaid: 1000 },
        { userId: "b", totalPaid: 0 },
      ],
      mealExpenseTotal: 1000,
      otherExpenseTotal: 0,
      activeUserCount: 2,
    };

    const summary = calculateMonthlySummary(input);

    // 10 + 10 + 5 guest = 25 total meals, cost per meal = 40
    expect(summary.totalMeals).toBe(25);
    expect(summary.guestMealCount).toBe(5);
    expect(summary.mealCost).toBeCloseTo(40, 2);

    const a = summary.people.find((p) => p.userId === "a")!;
    const b = summary.people.find((p) => p.userId === "b")!;

    // a hosted the 5 guests, so a is billed for 15 meals' worth; b only pays
    // for their own 10 — the guest cost isn't spread onto b.
    expect(a.personalMealCost).toBeCloseTo(600, 2);
    expect(b.personalMealCost).toBeCloseTo(400, 2);
    expect(summary.people).toHaveLength(2);
  });

  it("splits non-meal (other) expenses equally across active users and folds it into balance", () => {
    const input: MonthlyCalculationInput = {
      people: [
        { userId: "a", mealCount: 10, guestMealCount: 0 },
        { userId: "b", mealCount: 10, guestMealCount: 0 },
      ],
      payments: [
        { userId: "a", totalPaid: 600 },
        { userId: "b", totalPaid: 400 },
      ],
      mealExpenseTotal: 0,
      otherExpenseTotal: 1000,
      activeUserCount: 2,
    };

    const summary = calculateMonthlySummary(input);

    expect(summary.otherExpenseSharePerUser).toBeCloseTo(500, 2);

    const a = summary.people.find((p) => p.userId === "a")!;
    const b = summary.people.find((p) => p.userId === "b")!;

    expect(a.totalCost).toBeCloseTo(500, 2); // 0 meal cost + 500 other share
    expect(b.totalCost).toBeCloseTo(500, 2);
    expect(a.balance).toBeCloseTo(100, 2); // paid 600 - cost 500
    expect(b.balance).toBeCloseTo(-100, 2); // paid 400 - cost 500

    // Balances must always net to zero for a clean settlement.
    const sumOfBalances = summary.people.reduce((s, p) => s + p.balance, 0);
    expect(round2(sumOfBalances)).toBe(0);
  });

  it("never divides by zero when there are no meals in the month yet", () => {
    const input: MonthlyCalculationInput = {
      people: [
        { userId: "a", mealCount: 0, guestMealCount: 0 },
        { userId: "b", mealCount: 0, guestMealCount: 0 },
      ],
      payments: [],
      mealExpenseTotal: 0,
      otherExpenseTotal: 0,
      activeUserCount: 2,
    };

    const summary = calculateMonthlySummary(input);

    expect(summary.mealCost).toBe(0);
    expect(summary.people[0]!.balance).toBe(0);
    expect(summary.people[1]!.balance).toBe(0);
  });

  it("handles an odd person out with zero meals but who still made a payment", () => {
    const input: MonthlyCalculationInput = {
      people: [
        { userId: "a", mealCount: 20, guestMealCount: 0 },
        { userId: "b", mealCount: 0, guestMealCount: 0 },
      ],
      payments: [
        { userId: "a", totalPaid: 0 },
        { userId: "b", totalPaid: 2000 },
      ],
      mealExpenseTotal: 2000,
      otherExpenseTotal: 0,
      activeUserCount: 2,
    };

    const summary = calculateMonthlySummary(input);
    const a = summary.people.find((p) => p.userId === "a")!;
    const b = summary.people.find((p) => p.userId === "b")!;

    expect(a.balance).toBeCloseTo(-2000, 2);
    expect(b.balance).toBeCloseTo(2000, 2);
  });
});

describe("calculateSettlement", () => {
  it("produces a single transfer for a simple two-person imbalance", () => {
    const transfers = calculateSettlement([
      { userId: "moni", balance: 2500 },
      { userId: "taufiq", balance: -2500 },
    ]);

    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({
      fromUserId: "taufiq",
      toUserId: "moni",
      amount: 2500,
    });
  });

  it("produces no transfers when everyone is already settled", () => {
    const transfers = calculateSettlement([
      { userId: "a", balance: 0 },
      { userId: "b", balance: 0.001 },
    ]);

    expect(transfers).toHaveLength(0);
  });

  it("settles three or more people with minimal transfers", () => {
    const transfers = calculateSettlement([
      { userId: "a", balance: 300 },
      { userId: "b", balance: -100 },
      { userId: "c", balance: -200 },
    ]);

    const totalFromDebtors = transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalFromDebtors).toBeCloseTo(300, 2);
    expect(transfers.every((t) => t.toUserId === "a")).toBe(true);
  });
});
