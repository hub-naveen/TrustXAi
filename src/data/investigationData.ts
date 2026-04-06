import { transactions } from "@/data/mockData";

export type InvestigationNodeType = "bank-account" | "wallet" | "entity";
export type InvestigationRole = "source" | "intermediate" | "destination";
export type DetectionLabel = "Layering Detected" | "Smurfing Pattern" | "Circular Flow" | "Velocity Stacking";

export interface InvestigationNode {
  id: string;
  label: string;
  nodeType: InvestigationNodeType;
  role: InvestigationRole;
  defaultLayer: number;
  riskScore: number;
  holderName: string;
  phone: string;
  ipAddress: string;
  email: string;
  bankName: string;
}

export interface InvestigationEdge {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  timestamp: string;
  txRef: string;
}

export interface InvestigationPathRisk {
  id: string;
  label: DetectionLabel;
  riskScore: number;
  chain: string[];
  explanation: string;
}

export interface InvestigationCase {
  caseId: string;
  title: string;
  leadAgency: string;
  sourceNodeId: string;
  destinationNodeIds: string[];
  nodes: InvestigationNode[];
  edges: InvestigationEdge[];
  pathRisks: InvestigationPathRisk[];
}

export interface MergedInvestigationData {
  selectedCases: InvestigationCase[];
  nodes: InvestigationNode[];
  edges: InvestigationEdge[];
  sourceNodeIds: string[];
  destinationNodeIds: string[];
  pathRisks: InvestigationPathRisk[];
  commonNodeIds: string[];
  sharedPatternLabels: DetectionLabel[];
}

const txLookup = new Map(transactions.map((tx) => [tx.id, tx]));

const resolveAmount = (txRef: string, fallback: number) => txLookup.get(txRef)?.amount ?? fallback;

const nodeCatalog: Record<string, InvestigationNode> = {
  "acc-axis-3421": {
    id: "acc-axis-3421",
    label: "Axis ****3421",
    nodeType: "bank-account",
    role: "source",
    defaultLayer: 1,
    riskScore: 86,
    holderName: "Rohit Menon",
    phone: "+91-9988776655",
    ipAddress: "185.44.31.18",
    email: "rohit.menon@protonmail.com",
    bankName: "Axis Bank",
  },
  "source-kotak-9981": {
    id: "source-kotak-9981",
    label: "Kotak ****9981",
    nodeType: "bank-account",
    role: "source",
    defaultLayer: 1,
    riskScore: 79,
    holderName: "Nikhil Sharma",
    phone: "+91-9810022211",
    ipAddress: "103.22.15.91",
    email: "n.sharma@safe-mail.org",
    bankName: "Kotak Bank",
  },
  "source-pnb-2234": {
    id: "source-pnb-2234",
    label: "PNB ****2234",
    nodeType: "bank-account",
    role: "source",
    defaultLayer: 1,
    riskScore: 91,
    holderName: "Arman Patel",
    phone: "+91-9900112233",
    ipAddress: "103.22.15.91",
    email: "apatel@securemail.co",
    bankName: "PNB",
  },
  "mule-hdfc-1102": {
    id: "mule-hdfc-1102",
    label: "HDFC ****1102",
    nodeType: "bank-account",
    role: "intermediate",
    defaultLayer: 2,
    riskScore: 92,
    holderName: "R. Menon Trading",
    phone: "+91-9988776655",
    ipAddress: "185.44.31.18",
    email: "ops@rmenontrading.biz",
    bankName: "HDFC Bank",
  },
  "mule-sbi-9830": {
    id: "mule-sbi-9830",
    label: "SBI ****9830",
    nodeType: "bank-account",
    role: "intermediate",
    defaultLayer: 2,
    riskScore: 95,
    holderName: "N. Sharma Holdings",
    phone: "+91-9810022211",
    ipAddress: "179.61.40.22",
    email: "accounts@ns-holdings.biz",
    bankName: "SBI",
  },
  "mule-axis-1198": {
    id: "mule-axis-1198",
    label: "Axis ****1198",
    nodeType: "bank-account",
    role: "intermediate",
    defaultLayer: 2,
    riskScore: 90,
    holderName: "Apex Agro LLP",
    phone: "+91-9900112233",
    ipAddress: "179.61.40.22",
    email: "finance@apexagro.in",
    bankName: "Axis Bank",
  },
  "shell-orbit-imports": {
    id: "shell-orbit-imports",
    label: "Orbit Imports Pvt",
    nodeType: "entity",
    role: "intermediate",
    defaultLayer: 3,
    riskScore: 97,
    holderName: "Orbit Imports Pvt",
    phone: "+971-55-228-1990",
    ipAddress: "62.76.29.18",
    email: "director@orbitimports.ae",
    bankName: "Corporate Entity",
  },
  "shell-neon-trading": {
    id: "shell-neon-trading",
    label: "Neon Trade FZE",
    nodeType: "entity",
    role: "intermediate",
    defaultLayer: 3,
    riskScore: 96,
    holderName: "Neon Trade FZE",
    phone: "+971-55-228-1990",
    ipAddress: "62.76.29.18",
    email: "control@neontrade-fze.com",
    bankName: "Corporate Entity",
  },
  "entity-vortex-logistics": {
    id: "entity-vortex-logistics",
    label: "Vortex Logistics",
    nodeType: "entity",
    role: "intermediate",
    defaultLayer: 3,
    riskScore: 88,
    holderName: "Vortex Logistics LLP",
    phone: "+91-9900112233",
    ipAddress: "179.61.40.22",
    email: "ops@vortexlogistics.net",
    bankName: "Corporate Entity",
  },
  "wallet-xf3a9": {
    id: "wallet-xf3a9",
    label: "0xF3..a9",
    nodeType: "wallet",
    role: "destination",
    defaultLayer: 4,
    riskScore: 99,
    holderName: "Unknown Wallet Owner",
    phone: "+971-55-228-1990",
    ipAddress: "62.76.29.18",
    email: "wallet-controller@protonmail.com",
    bankName: "Unhosted Wallet",
  },
  "wallet-btc-4ab3": {
    id: "wallet-btc-4ab3",
    label: "BTC-4ab3",
    nodeType: "wallet",
    role: "destination",
    defaultLayer: 4,
    riskScore: 93,
    holderName: "External Custody Wallet",
    phone: "+44-020-8180-2271",
    ipAddress: "88.109.12.9",
    email: "custody@btc-node.cc",
    bankName: "Crypto Custody",
  },
  "crypto-mixer-arcus": {
    id: "crypto-mixer-arcus",
    label: "Arcus Mixer",
    nodeType: "wallet",
    role: "destination",
    defaultLayer: 4,
    riskScore: 98,
    holderName: "Arcus Mixing Service",
    phone: "+44-020-8180-2271",
    ipAddress: "88.109.12.9",
    email: "support@arcus-mixer.net",
    bankName: "Mixing Service",
  },
  "offshore-seychelles-77": {
    id: "offshore-seychelles-77",
    label: "Offshore #77",
    nodeType: "bank-account",
    role: "destination",
    defaultLayer: 4,
    riskScore: 97,
    holderName: "Oceancrest Holdings",
    phone: "+248-445-7710",
    ipAddress: "41.214.75.61",
    email: "ops@oceancrest.sc",
    bankName: "Seychelles Intl Bank",
  },
  "offshore-dubai-114": {
    id: "offshore-dubai-114",
    label: "Dubai #114",
    nodeType: "bank-account",
    role: "destination",
    defaultLayer: 4,
    riskScore: 92,
    holderName: "Goldline Export FZE",
    phone: "+971-55-228-1990",
    ipAddress: "62.76.29.18",
    email: "funds@goldlinefze.ae",
    bankName: "Dubai Private Bank",
  },
};

const buildNodes = (ids: string[]) => ids.map((id) => nodeCatalog[id]);

export const investigationCases: InvestigationCase[] = [
  {
    caseId: "CASE-ML-2026-0441",
    title: "Layered Wire To Crypto Wallet",
    leadAgency: "Cyber Crime Financial Cell",
    sourceNodeId: "acc-axis-3421",
    destinationNodeIds: ["wallet-xf3a9", "offshore-seychelles-77"],
    nodes: buildNodes([
      "acc-axis-3421",
      "mule-hdfc-1102",
      "mule-sbi-9830",
      "shell-orbit-imports",
      "wallet-xf3a9",
      "offshore-seychelles-77",
    ]),
    edges: [
      {
        id: "C0441-E1",
        from: "acc-axis-3421",
        to: "mule-hdfc-1102",
        amount: resolveAmount("TXN-8302", 114000),
        currency: "INR",
        timestamp: "2024-03-15T13:56:00Z",
        txRef: "TXN-8302",
      },
      {
        id: "C0441-E2",
        from: "mule-hdfc-1102",
        to: "mule-sbi-9830",
        amount: 109500,
        currency: "INR",
        timestamp: "2024-03-15T13:59:00Z",
        txRef: "TXN-LYR-4402",
      },
      {
        id: "C0441-E3",
        from: "mule-sbi-9830",
        to: "shell-orbit-imports",
        amount: resolveAmount("TXN-8298", 890000),
        currency: "INR",
        timestamp: "2024-03-15T14:04:00Z",
        txRef: "TXN-8298",
      },
      {
        id: "C0441-E4",
        from: "shell-orbit-imports",
        to: "wallet-xf3a9",
        amount: resolveAmount("TXN-8294", 247500),
        currency: "INR",
        timestamp: "2024-03-15T14:07:00Z",
        txRef: "TXN-8294",
      },
      {
        id: "C0441-E5",
        from: "shell-orbit-imports",
        to: "offshore-seychelles-77",
        amount: resolveAmount("TXN-8300", 1250000),
        currency: "INR",
        timestamp: "2024-03-15T14:12:00Z",
        txRef: "TXN-8300",
      },
    ],
    pathRisks: [
      {
        id: "C0441-P1",
        label: "Layering Detected",
        riskScore: 96,
        chain: ["acc-axis-3421", "mule-hdfc-1102", "mule-sbi-9830", "shell-orbit-imports", "wallet-xf3a9"],
        explanation: "Funds moved through three ownership hops before crypto conversion and offshore exit.",
      },
      {
        id: "C0441-P2",
        label: "Smurfing Pattern",
        riskScore: 91,
        chain: ["acc-axis-3421", "mule-hdfc-1102", "mule-sbi-9830"],
        explanation: "Amount split into sub-threshold transfers then re-aggregated into shell account.",
      },
      {
        id: "C0441-P3",
        label: "Velocity Stacking",
        riskScore: 87,
        chain: ["mule-hdfc-1102", "mule-sbi-9830", "shell-orbit-imports"],
        explanation: "Rapid sequential movement under 10 minute windows.",
      },
    ],
  },
  {
    caseId: "CASE-ML-2026-0617",
    title: "Cross-Border Mule Loop",
    leadAgency: "State FIU Investigation Wing",
    sourceNodeId: "source-kotak-9981",
    destinationNodeIds: ["wallet-xf3a9", "offshore-dubai-114", "crypto-mixer-arcus"],
    nodes: buildNodes([
      "source-kotak-9981",
      "mule-sbi-9830",
      "shell-neon-trading",
      "wallet-xf3a9",
      "offshore-dubai-114",
      "crypto-mixer-arcus",
    ]),
    edges: [
      {
        id: "C0617-E1",
        from: "source-kotak-9981",
        to: "mule-sbi-9830",
        amount: 274000,
        currency: "INR",
        timestamp: "2024-03-15T14:15:00Z",
        txRef: "TXN-LYR-6171",
      },
      {
        id: "C0617-E2",
        from: "mule-sbi-9830",
        to: "shell-neon-trading",
        amount: 271100,
        currency: "INR",
        timestamp: "2024-03-15T14:17:00Z",
        txRef: "TXN-LYR-6172",
      },
      {
        id: "C0617-E3",
        from: "shell-neon-trading",
        to: "wallet-xf3a9",
        amount: resolveAmount("TXN-8296", 89000),
        currency: "INR",
        timestamp: "2024-03-15T14:20:00Z",
        txRef: "TXN-8296",
      },
      {
        id: "C0617-E4",
        from: "wallet-xf3a9",
        to: "crypto-mixer-arcus",
        amount: 263500,
        currency: "INR",
        timestamp: "2024-03-15T14:22:00Z",
        txRef: "TXN-LYR-6174",
      },
      {
        id: "C0617-E5",
        from: "shell-neon-trading",
        to: "offshore-dubai-114",
        amount: resolveAmount("TXN-8303", 420000),
        currency: "INR",
        timestamp: "2024-03-15T14:24:00Z",
        txRef: "TXN-8303",
      },
      {
        id: "C0617-E6",
        from: "crypto-mixer-arcus",
        to: "mule-sbi-9830",
        amount: 68000,
        currency: "INR",
        timestamp: "2024-03-15T14:27:00Z",
        txRef: "TXN-LYR-6176",
      },
    ],
    pathRisks: [
      {
        id: "C0617-P1",
        label: "Circular Flow",
        riskScore: 94,
        chain: ["source-kotak-9981", "mule-sbi-9830", "shell-neon-trading", "wallet-xf3a9", "crypto-mixer-arcus", "mule-sbi-9830"],
        explanation: "Loop-back transfer indicates laundering cycle to obscure ultimate beneficiary.",
      },
      {
        id: "C0617-P2",
        label: "Layering Detected",
        riskScore: 92,
        chain: ["source-kotak-9981", "mule-sbi-9830", "shell-neon-trading", "offshore-dubai-114"],
        explanation: "Multi-hop transfer with shared control identifiers across shell and offshore nodes.",
      },
      {
        id: "C0617-P3",
        label: "Velocity Stacking",
        riskScore: 88,
        chain: ["mule-sbi-9830", "shell-neon-trading", "wallet-xf3a9", "crypto-mixer-arcus"],
        explanation: "Stacked high-value transfers across four entities in less than 12 minutes.",
      },
    ],
  },
  {
    caseId: "CASE-ML-2026-0729",
    title: "Shell Cascade To Offshore",
    leadAgency: "National AML Task Force",
    sourceNodeId: "source-pnb-2234",
    destinationNodeIds: ["wallet-btc-4ab3", "offshore-seychelles-77"],
    nodes: buildNodes([
      "source-pnb-2234",
      "mule-axis-1198",
      "entity-vortex-logistics",
      "shell-neon-trading",
      "wallet-btc-4ab3",
      "offshore-seychelles-77",
    ]),
    edges: [
      {
        id: "C0729-E1",
        from: "source-pnb-2234",
        to: "mule-axis-1198",
        amount: resolveAmount("TXN-8298", 890000),
        currency: "INR",
        timestamp: "2024-03-15T13:48:00Z",
        txRef: "TXN-8298",
      },
      {
        id: "C0729-E2",
        from: "mule-axis-1198",
        to: "entity-vortex-logistics",
        amount: 431000,
        currency: "INR",
        timestamp: "2024-03-15T13:51:00Z",
        txRef: "TXN-LYR-7292",
      },
      {
        id: "C0729-E3",
        from: "entity-vortex-logistics",
        to: "shell-neon-trading",
        amount: 420000,
        currency: "INR",
        timestamp: "2024-03-15T13:54:00Z",
        txRef: "TXN-LYR-7293",
      },
      {
        id: "C0729-E4",
        from: "shell-neon-trading",
        to: "wallet-btc-4ab3",
        amount: 366000,
        currency: "INR",
        timestamp: "2024-03-15T13:57:00Z",
        txRef: "TXN-LYR-7294",
      },
      {
        id: "C0729-E5",
        from: "shell-neon-trading",
        to: "offshore-seychelles-77",
        amount: resolveAmount("TXN-8300", 1250000),
        currency: "INR",
        timestamp: "2024-03-15T14:00:00Z",
        txRef: "TXN-8300",
      },
      {
        id: "C0729-E6",
        from: "wallet-btc-4ab3",
        to: "offshore-seychelles-77",
        amount: 148000,
        currency: "INR",
        timestamp: "2024-03-15T14:05:00Z",
        txRef: "TXN-LYR-7296",
      },
    ],
    pathRisks: [
      {
        id: "C0729-P1",
        label: "Layering Detected",
        riskScore: 95,
        chain: ["source-pnb-2234", "mule-axis-1198", "entity-vortex-logistics", "shell-neon-trading", "wallet-btc-4ab3"],
        explanation: "Layered shell chain with rapid conversion into external crypto custody.",
      },
      {
        id: "C0729-P2",
        label: "Smurfing Pattern",
        riskScore: 89,
        chain: ["source-pnb-2234", "mule-axis-1198", "entity-vortex-logistics"],
        explanation: "Large amount decomposed into multiple sub-threshold routing hops.",
      },
      {
        id: "C0729-P3",
        label: "Velocity Stacking",
        riskScore: 84,
        chain: ["mule-axis-1198", "entity-vortex-logistics", "shell-neon-trading", "wallet-btc-4ab3"],
        explanation: "Four hop path completed in under 10 minutes.",
      },
    ],
  },
];

export const investigationCaseOptions = investigationCases.map((entry) => ({
  caseId: entry.caseId,
  title: entry.title,
  leadAgency: entry.leadAgency,
}));

const uniqueStrings = (values: string[]) => Array.from(new Set(values));

export const mergeInvestigationCases = (caseIds: string[]): MergedInvestigationData => {
  const selectedCases = investigationCases.filter((entry) => caseIds.includes(entry.caseId));
  if (!selectedCases.length) {
    return {
      selectedCases: [],
      nodes: [],
      edges: [],
      sourceNodeIds: [],
      destinationNodeIds: [],
      pathRisks: [],
      commonNodeIds: [],
      sharedPatternLabels: [],
    };
  }

  const nodeMap = new Map<string, InvestigationNode>();
  const nodeCaseMap = new Map<string, Set<string>>();
  const edgeMap = new Map<string, InvestigationEdge>();

  for (const entry of selectedCases) {
    for (const node of entry.nodes) {
      nodeMap.set(node.id, node);
      const set = nodeCaseMap.get(node.id) ?? new Set<string>();
      set.add(entry.caseId);
      nodeCaseMap.set(node.id, set);
    }
    for (const edge of entry.edges) {
      edgeMap.set(edge.id, edge);
    }
  }

  const labelFrequency = new Map<DetectionLabel, number>();
  for (const entry of selectedCases) {
    const labelsInCase = new Set<DetectionLabel>(entry.pathRisks.map((risk) => risk.label));
    for (const label of labelsInCase) {
      labelFrequency.set(label, (labelFrequency.get(label) ?? 0) + 1);
    }
  }

  const commonNodeIds = Array.from(nodeCaseMap.entries())
    .filter(([, caseSet]) => caseSet.size > 1)
    .map(([nodeId]) => nodeId);

  return {
    selectedCases,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    sourceNodeIds: uniqueStrings(selectedCases.map((entry) => entry.sourceNodeId)),
    destinationNodeIds: uniqueStrings(selectedCases.flatMap((entry) => entry.destinationNodeIds)),
    pathRisks: selectedCases.flatMap((entry) => entry.pathRisks),
    commonNodeIds,
    sharedPatternLabels: Array.from(labelFrequency.entries())
      .filter(([, count]) => count > 1)
      .map(([label]) => label),
  };
};
