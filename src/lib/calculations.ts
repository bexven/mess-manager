/**
 * Pure, side-effect-free financial calculations for the mess/household ledger.
 * Kept isolated from Prisma/DB types so it can be unit tested directly
 * (see tests/calculations.test.ts) and reasoned about without a database.
 */

export interface PersonMealInput {
  userId: string;
  /** Number of meal slots (lunch/dinner) this person marked "Ate" during the month. */
  mealCount: number;
}

export interface PersonPaymentInput {
  userId: string;
  /** Sum of every expense this person paid for, regardless of category. */
  totalPaid: number;
}

export interface MonthlyCalculationInput {
  /** Meal counts per active user. */
  people: PersonMealInput[];
  /** Amounts paid per active user (may include users with 0 meals but who still paid). */
  payments: PersonPaymentInput[];
  /** Total guest meals (lunch + dinner) for the month. Not attributed to any person. */
  guestMealCount: number;
  /** Sum of expense amounts flagged countsTowardMealCost = true. */
  mealExpenseTotal: number;
  /** Sum of expense amounts flagged countsTowardMealCost = false. */
  otherExpenseTotal: number;
  /** Number of active users the "other" (non-meal) expenses are split across. */
  activeUserCount: number;
}

export interface PersonSummary {
  userId: string;
  mealCount: number;
  personalMealCost: number;
  otherExpenseShare: number;
  totalCost: number;
  totalPaid: number;
  /** Positive = should receive money. Negative = owes money. */
  balance: number;
}

export interface MonthlySummary {
  totalPersonalMeals: number;
  guestMealCount: number;
  totalMeals: number;
  mealExpenseTotal: number;
  otherExpenseTotal: number;
  totalExpenseAmount: number;
  /** Cost of a single meal slot. 0 when there are no meals to avoid divide-by-zero. */
  mealCost: number;
  otherExpenseSharePerUser: number;
  people: PersonSummary[];
}

/** Rounds to 2 decimal places using half-up rounding, avoiding floating point artifacts. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateMonthlySummary(input: MonthlyCalculationInput): MonthlySummary {
  const totalPersonalMeals = input.people.reduce((sum, p) => sum + p.mealCount, 0);
  const totalMeals = totalPersonalMeals + input.guestMealCount;

  const mealCost = totalMeals > 0 ? input.mealExpenseTotal / totalMeals : 0;

  const otherExpenseSharePerUser =
    input.activeUserCount > 0 ? input.otherExpenseTotal / input.activeUserCount : 0;

  const paidByUser = new Map(input.payments.map((p) => [p.userId, p.totalPaid]));

  const people: PersonSummary[] = input.people.map((person) => {
    const personalMealCost = person.mealCount * mealCost;
    const totalCost = personalMealCost + otherExpenseSharePerUser;
    const totalPaid = paidByUser.get(person.userId) ?? 0;
    const balance = totalPaid - totalCost;

    return {
      userId: person.userId,
      mealCount: person.mealCount,
      personalMealCost: round2(personalMealCost),
      otherExpenseShare: round2(otherExpenseSharePerUser),
      totalCost: round2(totalCost),
      totalPaid: round2(totalPaid),
      balance: round2(balance),
    };
  });

  return {
    totalPersonalMeals,
    guestMealCount: input.guestMealCount,
    totalMeals,
    mealExpenseTotal: round2(input.mealExpenseTotal),
    otherExpenseTotal: round2(input.otherExpenseTotal),
    totalExpenseAmount: round2(input.mealExpenseTotal + input.otherExpenseTotal),
    mealCost: round2(mealCost),
    otherExpenseSharePerUser: round2(otherExpenseSharePerUser),
    people,
  };
}

export interface SettlementTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * Turns a list of balances into the minimal set of transfers needed to settle up.
 * Greedy matching of largest debtor to largest creditor — optimal for small
 * households and produces at most (n - 1) transfers.
 */
export function calculateSettlement(
  people: { userId: string; balance: number }[],
): SettlementTransfer[] {
  const creditors = people
    .filter((p) => p.balance > 0.004)
    .map((p) => ({ userId: p.userId, amount: p.balance }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = people
    .filter((p) => p.balance < -0.004)
    .map((p) => ({ userId: p.userId, amount: -p.balance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = round2(Math.min(debtor.amount, creditor.amount));

    if (amount > 0.004) {
      transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amount });
    }

    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);

    if (debtor.amount <= 0.004) i++;
    if (creditor.amount <= 0.004) j++;
  }

  return transfers;
}
