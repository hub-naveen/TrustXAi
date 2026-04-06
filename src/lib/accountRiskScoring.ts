import type { Transaction } from "@/data/mockData";

const HIGH_RISK_THRESHOLD = 80;
const MEDIUM_RISK_THRESHOLD = 60;
const HIGH_VALUE_THRESHOLD = 250_000;
const VELOCITY_WINDOW_MS = 30 * 60 * 1000;

interface AccountAccumulator {
  accountId: string;
  institution: string;
  transactionCount: number;
  inboundCount: number;
  outboundCount: number;
  totalIn: number;
  totalOut: number;
  riskTotal: number;
  highRiskCount: number;
  mediumRiskCount: number;
  blockedCount: number;
  flaggedCount: number;
  highValueCount: number;
  riskyTypeCount: number;
  counterparties: Set<string>;
  outboundTimestamps: number[];
}

export interface AccountRiskScore {
  accountId: string;
  institution: string;
  score: number;
  tier: "critical" | "high" | "medium" | "low";
  transactionCount: number;
  inboundCount: number;
  outboundCount: number;
  totalIn: number;
  totalOut: number;
  avgRisk: number;
  blockedCount: number;
  flaggedCount: number;
  highRiskCount: number;
  velocityBurst: number;
  highValueCount: number;
  counterpartyCount: number;
  behaviorTags: string[];
}

const riskyTypeRegex = /(wire|swift|rtgs|bulk|crypto|online|offshore|mixer)/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function peakVelocity(timestamps: number[]): number {
  if (!timestamps.length) {
    return 0;
  }

  const sorted = [...timestamps].sort((left, right) => left - right);
  let left = 0;
  let best = 1;

  for (let right = 0; right < sorted.length; right += 1) {
    while (sorted[right] - sorted[left] > VELOCITY_WINDOW_MS) {
      left += 1;
    }
    best = Math.max(best, right - left + 1);
  }

  return best;
}

function getTier(score: number): AccountRiskScore["tier"] {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 70) {
    return "high";
  }
  if (score >= 45) {
    return "medium";
  }
  return "low";
}

function pushBehaviorTags(
  account: AccountAccumulator,
  avgRisk: number,
  velocityBurst: number,
  counterpartyCount: number,
): string[] {
  const tags: string[] = [];

  if (account.blockedCount > 0) {
    tags.push("Blocked events present");
  }
  if (account.flaggedCount > 0) {
    tags.push("Flagged monitoring alerts");
  }
  if (velocityBurst >= 4) {
    tags.push("Velocity burst in 30m window");
  }
  if (account.highValueCount > 0) {
    tags.push("High-value transfer exposure");
  }
  if (counterpartyCount >= 6) {
    tags.push("Wide counterparty spread");
  }
  if (avgRisk >= HIGH_RISK_THRESHOLD) {
    tags.push("Persistent high-risk behavior");
  }

  if (!tags.length) {
    tags.push("Stable behavior profile");
  }

  return tags;
}

function getOrCreateAccumulator(
  accumulatorMap: Map<string, AccountAccumulator>,
  accountId: string,
  institution: string,
): AccountAccumulator {
  const existing = accumulatorMap.get(accountId);
  if (existing) {
    if (!existing.institution && institution) {
      existing.institution = institution;
    }
    return existing;
  }

  const created: AccountAccumulator = {
    accountId,
    institution,
    transactionCount: 0,
    inboundCount: 0,
    outboundCount: 0,
    totalIn: 0,
    totalOut: 0,
    riskTotal: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    blockedCount: 0,
    flaggedCount: 0,
    highValueCount: 0,
    riskyTypeCount: 0,
    counterparties: new Set<string>(),
    outboundTimestamps: [],
  };

  accumulatorMap.set(accountId, created);
  return created;
}

export function computeAccountRiskScores(transactions: Transaction[]): AccountRiskScore[] {
  const accountMap = new Map<string, AccountAccumulator>();

  for (const transaction of transactions) {
    const eventTime = new Date(transaction.timestamp).getTime();
    const safeEventTime = Number.isFinite(eventTime) ? eventTime : 0;

    const source = getOrCreateAccumulator(accountMap, transaction.from, transaction.institution || "Unknown");
    const destination = getOrCreateAccumulator(accountMap, transaction.to, "External Counterparty");

    source.transactionCount += 1;
    source.outboundCount += 1;
    source.totalOut += transaction.amount;
    source.riskTotal += transaction.riskScore;
    source.outboundTimestamps.push(safeEventTime);
    source.counterparties.add(transaction.to);

    destination.transactionCount += 1;
    destination.inboundCount += 1;
    destination.totalIn += transaction.amount;
    destination.riskTotal += transaction.riskScore;
    destination.counterparties.add(transaction.from);

    if (transaction.riskScore >= HIGH_RISK_THRESHOLD) {
      source.highRiskCount += 1;
      destination.highRiskCount += 1;
    } else if (transaction.riskScore >= MEDIUM_RISK_THRESHOLD) {
      source.mediumRiskCount += 1;
      destination.mediumRiskCount += 1;
    }

    if (transaction.status === "blocked") {
      source.blockedCount += 1;
      destination.blockedCount += 1;
    }
    if (transaction.status === "flagged") {
      source.flaggedCount += 1;
      destination.flaggedCount += 1;
    }

    if (transaction.amount >= HIGH_VALUE_THRESHOLD) {
      source.highValueCount += 1;
      destination.highValueCount += 1;
    }

    if (riskyTypeRegex.test(transaction.type) || riskyTypeRegex.test(transaction.to)) {
      source.riskyTypeCount += 1;
      destination.riskyTypeCount += 1;
    }
  }

  const riskScores: AccountRiskScore[] = [];

  for (const account of accountMap.values()) {
    const transactionCount = Math.max(account.transactionCount, 1);
    const avgRisk = account.riskTotal / transactionCount;
    const blockedRate = account.blockedCount / transactionCount;
    const flaggedRate = account.flaggedCount / transactionCount;
    const highValueRate = account.highValueCount / transactionCount;
    const riskyTypeRate = account.riskyTypeCount / transactionCount;
    const velocityBurst = peakVelocity(account.outboundTimestamps);
    const velocityNorm = clamp((velocityBurst - 1) / 5, 0, 1);
    const counterpartyCount = account.counterparties.size;
    const counterpartyNorm = clamp(counterpartyCount / 10, 0, 1);
    const avgRiskNorm = clamp(avgRisk / 100, 0, 1);

    const weightedScore =
      avgRiskNorm * 0.33 +
      blockedRate * 0.2 +
      flaggedRate * 0.15 +
      highValueRate * 0.1 +
      velocityNorm * 0.1 +
      riskyTypeRate * 0.07 +
      counterpartyNorm * 0.05;

    const escalationBoost =
      (account.highRiskCount >= 3 ? 5 : 0) +
      (velocityBurst >= 4 ? 3 : 0) +
      (account.blockedCount >= 2 ? 2 : 0);

    const score = clamp(Math.round(weightedScore * 100 + escalationBoost), 0, 100);
    const behaviorTags = pushBehaviorTags(account, avgRisk, velocityBurst, counterpartyCount);

    riskScores.push({
      accountId: account.accountId,
      institution: account.institution || "Unknown",
      score,
      tier: getTier(score),
      transactionCount: account.transactionCount,
      inboundCount: account.inboundCount,
      outboundCount: account.outboundCount,
      totalIn: account.totalIn,
      totalOut: account.totalOut,
      avgRisk: Math.round(avgRisk),
      blockedCount: account.blockedCount,
      flaggedCount: account.flaggedCount,
      highRiskCount: account.highRiskCount,
      velocityBurst,
      highValueCount: account.highValueCount,
      counterpartyCount,
      behaviorTags,
    });
  }

  return riskScores.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return right.transactionCount - left.transactionCount;
  });
}