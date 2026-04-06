from __future__ import annotations

from datetime import datetime, timezone
from math import exp

from pymongo.database import Database

from app.blockchain.ledger import add_pending_record, mine_pending_records
from app.core.security import get_password_hash


def parse_ts(timestamp: str) -> datetime:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))


def seed_database(db: Database) -> None:
    if db["users"].count_documents({}) > 0:
        return

    users = [
        {
            "id": 1,
            "email": "admin@rbi.gov.in",
            "full_name": "Rajesh Chandra",
            "institution": "RBI CFMC",
            "role": "admin",
            "avatar": "RC",
            "password_hash": get_password_hash("demo1234"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": 2,
            "email": "analyst@sbi.co.in",
            "full_name": "Priya Sharma",
            "institution": "State Bank of India",
            "role": "analyst",
            "avatar": "PS",
            "password_hash": get_password_hash("demo1234"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": 3,
            "email": "viewer@hdfc.com",
            "full_name": "Amit Patel",
            "institution": "HDFC Bank",
            "role": "viewer",
            "avatar": "AP",
            "password_hash": get_password_hash("demo1234"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        },
    ]
    db["users"].insert_many(users)

    db["user_settings"].insert_many(
        [
            {
                "user_id": 1,
                "notify_critical": True,
                "notify_high": True,
                "notify_weekly": True,
                "notify_model_updates": True,
                "accent_name": "Gold",
            },
            {
                "user_id": 2,
                "notify_critical": True,
                "notify_high": True,
                "notify_weekly": False,
                "notify_model_updates": True,
                "accent_name": "Gold",
            },
            {
                "user_id": 3,
                "notify_critical": True,
                "notify_high": False,
                "notify_weekly": False,
                "notify_model_updates": False,
                "accent_name": "Gold",
            },
        ]
    )

    db["api_keys"].insert_many(
        [
            {
                "key_id": "key_live_admin_001",
                "user_id": 1,
                "name": "Production Gateway",
                "key_masked": "tc_live_************************_A1",
                "last_used": "2 hours ago",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            },
            {
                "key_id": "key_dev_analyst_001",
                "user_id": 2,
                "name": "Analytics Sandbox",
                "key_masked": "tc_dev_************************_B9",
                "last_used": "Yesterday",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            },
        ]
    )

    transactions = [
        {
            "id": "TXN-8294",
            "from_account": "Axis Bank ****3421",
            "to_account": "Unknown Wallet 0xF3..a9",
            "amount": 247500,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:23:00Z"),
            "risk_score": 94,
            "status": "blocked",
            "type": "Wire Transfer",
            "institution": "Axis Bank",
        },
        {
            "id": "TXN-8295",
            "from_account": "HDFC ****7812",
            "to_account": "Merchant #4491",
            "amount": 12300,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:21:00Z"),
            "risk_score": 12,
            "status": "approved",
            "type": "POS Payment",
            "institution": "HDFC Bank",
        },
        {
            "id": "TXN-8296",
            "from_account": "SBI ****0093",
            "to_account": "Crypto Exchange",
            "amount": 89000,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:18:00Z"),
            "risk_score": 78,
            "status": "flagged",
            "type": "Online Transfer",
            "institution": "SBI",
        },
        {
            "id": "TXN-8297",
            "from_account": "ICICI ****5567",
            "to_account": "Insurance Corp",
            "amount": 45000,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:15:00Z"),
            "risk_score": 5,
            "status": "approved",
            "type": "Premium Payment",
            "institution": "ICICI Bank",
        },
        {
            "id": "TXN-8298",
            "from_account": "PNB ****2234",
            "to_account": "Shell Company Ltd",
            "amount": 890000,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:10:00Z"),
            "risk_score": 97,
            "status": "blocked",
            "type": "NEFT",
            "institution": "PNB",
        },
        {
            "id": "TXN-8299",
            "from_account": "Kotak ****9981",
            "to_account": "E-commerce Store",
            "amount": 3400,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:08:00Z"),
            "risk_score": 8,
            "status": "approved",
            "type": "UPI",
            "institution": "Kotak Bank",
        },
        {
            "id": "TXN-8300",
            "from_account": "BOB ****4456",
            "to_account": "Offshore Account",
            "amount": 1250000,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:05:00Z"),
            "risk_score": 91,
            "status": "blocked",
            "type": "RTGS",
            "institution": "Bank of Baroda",
        },
        {
            "id": "TXN-8301",
            "from_account": "Yes Bank ****7723",
            "to_account": "Utility Provider",
            "amount": 2100,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T14:02:00Z"),
            "risk_score": 3,
            "status": "approved",
            "type": "Auto-Debit",
            "institution": "Yes Bank",
        },
        {
            "id": "TXN-8302",
            "from_account": "Axis Bank ****1198",
            "to_account": "Multiple Recipients",
            "amount": 567000,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T13:58:00Z"),
            "risk_score": 85,
            "status": "flagged",
            "type": "Bulk Transfer",
            "institution": "Axis Bank",
        },
        {
            "id": "TXN-8303",
            "from_account": "HDFC ****3344",
            "to_account": "International Wire",
            "amount": 420000,
            "currency": "INR",
            "timestamp": parse_ts("2024-03-15T13:55:00Z"),
            "risk_score": 62,
            "status": "flagged",
            "type": "SWIFT",
            "institution": "HDFC Bank",
        },
    ]
    db["transactions"].insert_many(transactions)

    alerts = [
        {
            "id": "ALT-001",
            "title": "Velocity Anomaly Detected",
            "description": "15 transactions in 2 minutes from single account",
            "severity": "critical",
            "timestamp": parse_ts("2024-03-15T14:23:00Z"),
            "transaction_id": "TXN-8294",
        },
        {
            "id": "ALT-002",
            "title": "Shell Company Transfer",
            "description": "Large transfer to entity with no trading history",
            "severity": "critical",
            "timestamp": parse_ts("2024-03-15T14:10:00Z"),
            "transaction_id": "TXN-8298",
        },
        {
            "id": "ALT-003",
            "title": "Crypto Conversion Pattern",
            "description": "Fiat-to-crypto conversion matching known laundering pattern",
            "severity": "high",
            "timestamp": parse_ts("2024-03-15T14:18:00Z"),
            "transaction_id": "TXN-8296",
        },
        {
            "id": "ALT-004",
            "title": "Unusual Bulk Transfer",
            "description": "Multiple small recipients from single high-value transfer",
            "severity": "high",
            "timestamp": parse_ts("2024-03-15T13:58:00Z"),
            "transaction_id": "TXN-8302",
        },
        {
            "id": "ALT-005",
            "title": "Cross-Border Threshold",
            "description": "International wire approaching reporting threshold",
            "severity": "medium",
            "timestamp": parse_ts("2024-03-15T13:55:00Z"),
            "transaction_id": "TXN-8303",
        },
    ]
    db["alerts"].insert_many(alerts)

    db["fraud_dna"].insert_many(
        [
            {
                "id": "DNA-001",
                "hash": "0x7f3a9c2d",
                "pattern": "Velocity Stacking",
                "similarity": 97.3,
                "detected_at": parse_ts("2024-03-15T14:23:00Z"),
                "source": "Axis Bank Network",
                "category": "Transaction Layering",
            },
            {
                "id": "DNA-002",
                "hash": "0x4b1e8f7a",
                "pattern": "Shell Hop Pattern",
                "similarity": 94.1,
                "detected_at": parse_ts("2024-03-15T14:10:00Z"),
                "source": "Multi-Bank Detection",
                "category": "Money Laundering",
            },
            {
                "id": "DNA-003",
                "hash": "0x2c9d1e5b",
                "pattern": "Crypto Wash Trading",
                "similarity": 89.6,
                "detected_at": parse_ts("2024-03-15T14:18:00Z"),
                "source": "SBI Monitoring",
                "category": "Cryptocurrency Fraud",
            },
        ]
    )

    db["blockchain_entries"].insert_many(
        [
            {
                "id": 1,
                "tx_hash": "0x9f2a4b7c3d8e1f",
                "block_number": 18847291,
                "timestamp": parse_ts("2024-03-15T14:24:00Z"),
                "action": "STORE_FRAUD_DNA",
                "fraud_dna_hash": "0x7f3a9c2d",
                "status": "confirmed",
                "gas_used": 47832,
            },
            {
                "id": 2,
                "tx_hash": "0x3e1d7c2f8a9b4e",
                "block_number": 18847285,
                "timestamp": parse_ts("2024-03-15T14:11:00Z"),
                "action": "FLAG_TRANSACTION",
                "fraud_dna_hash": "0x4b1e8f7a",
                "status": "confirmed",
                "gas_used": 52100,
            },
            {
                "id": 3,
                "tx_hash": "0x6b8f2e4a1c7d9f",
                "block_number": 18847279,
                "timestamp": parse_ts("2024-03-15T14:19:00Z"),
                "action": "STORE_FRAUD_DNA",
                "fraud_dna_hash": "0x2c9d1e5b",
                "status": "confirmed",
                "gas_used": 48950,
            },
            {
                "id": 4,
                "tx_hash": "0xa4c9d18e2f3b7c",
                "block_number": 18847260,
                "timestamp": parse_ts("2024-03-15T13:59:00Z"),
                "action": "UPDATE_RISK_SCORE",
                "fraud_dna_hash": "0x8a4f3d6c",
                "status": "confirmed",
                "gas_used": 31200,
            },
            {
                "id": 5,
                "tx_hash": "0x5f7b3a1d9c4e8f",
                "block_number": 18847250,
                "timestamp": parse_ts("2024-03-15T13:45:00Z"),
                "action": "SMART_CONTRACT_EXEC",
                "fraud_dna_hash": "0x1d7e5a9f",
                "status": "pending",
                "gas_used": 68400,
            },
        ]
    )

    db["smart_contracts"].insert_many(
        [
            {"id": 1, "name": "FraudDNARegistry.sol", "address": "0x742d35Cc", "calls": 2847, "status": "active"},
            {"id": 2, "name": "RiskOracle.sol", "address": "0x1f9a8bD2", "calls": 12340, "status": "active"},
            {"id": 3, "name": "ComplianceGate.sol", "address": "0x3e7c4aF1", "calls": 5621, "status": "active"},
            {"id": 4, "name": "AlertDispatcher.sol", "address": "0x8b2d9cE3", "calls": 891, "status": "paused"},
        ]
    )

    db["institutions"].insert_many(
        [
            {"id": "INST-001", "name": "HDFC Bank", "type": "Commercial Bank", "trust_score": 96, "status": "active", "nodes_count": 12, "last_sync": parse_ts("2024-03-15T14:20:00Z")},
            {"id": "INST-002", "name": "SBI", "type": "Public Sector Bank", "trust_score": 94, "status": "active", "nodes_count": 18, "last_sync": parse_ts("2024-03-15T14:18:00Z")},
            {"id": "INST-003", "name": "Axis Bank", "type": "Commercial Bank", "trust_score": 92, "status": "active", "nodes_count": 8, "last_sync": parse_ts("2024-03-15T14:22:00Z")},
            {"id": "INST-004", "name": "ICICI Bank", "type": "Commercial Bank", "trust_score": 95, "status": "active", "nodes_count": 14, "last_sync": parse_ts("2024-03-15T14:15:00Z")},
            {"id": "INST-005", "name": "PNB", "type": "Public Sector Bank", "trust_score": 88, "status": "active", "nodes_count": 10, "last_sync": parse_ts("2024-03-15T14:05:00Z")},
            {"id": "INST-006", "name": "RBI CFMC", "type": "Regulator", "trust_score": 99, "status": "active", "nodes_count": 3, "last_sync": parse_ts("2024-03-15T14:23:00Z")},
        ]
    )

    db["model_updates"].insert_many(
        [
            {"id": "MU-001", "institution": "HDFC Bank", "version": "v3.2.1", "accuracy": 97.8, "timestamp": parse_ts("2024-03-15T12:00:00Z"), "status": "merged", "improvement": 1.2},
            {"id": "MU-002", "institution": "SBI", "version": "v3.2.0", "accuracy": 96.4, "timestamp": parse_ts("2024-03-15T10:30:00Z"), "status": "merged", "improvement": 0.8},
            {"id": "MU-003", "institution": "Axis Bank", "version": "v3.1.9", "accuracy": 95.9, "timestamp": parse_ts("2024-03-15T08:00:00Z"), "status": "validating", "improvement": 0.5},
            {"id": "MU-004", "institution": "ICICI Bank", "version": "v3.2.1", "accuracy": 97.1, "timestamp": parse_ts("2024-03-14T22:00:00Z"), "status": "merged", "improvement": 1.5},
            {"id": "MU-005", "institution": "PNB", "version": "v3.1.8", "accuracy": 93.2, "timestamp": parse_ts("2024-03-14T18:00:00Z"), "status": "rejected", "improvement": -0.3},
        ]
    )

    db["convergence_rounds"].insert_many(
        [
            {
                "round": round_num,
                "global_loss": round(2.4 * exp(-0.18 * (round_num - 1)) + 0.08 + (((round_num % 3) - 1) * 0.015), 3),
                "accuracy": round(100 - 14 * exp(-0.22 * (round_num - 1)) - ((round_num % 4) * 0.11), 1),
            }
            for round_num in range(1, 21)
        ]
    )

    db["privacy_metrics"].insert_many(
        [
            {"id": 1, "metric": "epsilon_budget_used", "value": 72, "max_value": 100, "color": "warning"},
            {"id": 2, "metric": "noise_multiplier", "value": 45, "max_value": 100, "color": "accent"},
            {"id": 3, "metric": "gradient_clipping", "value": 88, "max_value": 100, "color": "success"},
            {"id": 4, "metric": "secure_aggregation", "value": 100, "max_value": 100, "color": "primary"},
            {"id": 5, "metric": "data_isolation", "value": 100, "max_value": 100, "color": "success"},
        ]
    )

    db["admin_audit_logs"].insert_many(
        [
            {"id": 1, "actor": "admin@rbi.gov.in", "action": "Modified RLS policy", "target": "fraud_reports", "timestamp": parse_ts("2024-03-15T14:23:00Z"), "severity": "high"},
            {"id": 2, "actor": "analyst@sbi.co.in", "action": "Exported transaction data", "target": "transactions", "timestamp": parse_ts("2024-03-15T14:18:00Z"), "severity": "medium"},
            {"id": 3, "actor": "admin@rbi.gov.in", "action": "Added new institution node", "target": "Federal Bank", "timestamp": parse_ts("2024-03-15T13:45:00Z"), "severity": "low"},
            {"id": 4, "actor": "admin@rbi.gov.in", "action": "Revoked API key", "target": "tc_live_old_key", "timestamp": parse_ts("2024-03-15T10:30:00Z"), "severity": "high"},
        ]
    )

    db["threat_feed"].insert_many(
        [
            {"id": 1, "threat_type": "Phishing Campaign", "source": "CERT-In", "severity": "critical", "time_label": "2m ago", "description": "New phishing kit targeting UPI payment flows"},
            {"id": 2, "threat_type": "Ransomware Alert", "source": "FS-ISAC", "severity": "high", "time_label": "15m ago", "description": "LockBit variant targeting banking SWIFT endpoints"},
            {"id": 3, "threat_type": "Data Breach", "source": "DarkWeb Monitor", "severity": "high", "time_label": "1h ago", "description": "Credential dump containing 50K Indian bank accounts"},
            {"id": 4, "threat_type": "Zero-Day Exploit", "source": "NVD", "severity": "critical", "time_label": "3h ago", "description": "RCE in common banking middleware"},
        ]
    )

    investigation_cases = [
        {
            "case_id": "CASE-ML-2026-0441",
            "title": "Layered Wire To Crypto Wallet",
            "lead_agency": "Cyber Crime Financial Cell",
            "source_node_id": "acc-axis-3421",
            "destination_node_ids": ["wallet-xf3a9", "offshore-seychelles-77"],
            "nodes": [
                {"id": "acc-axis-3421", "label": "Axis ****3421", "node_type": "bank-account", "role": "source", "default_layer": 1, "risk_score": 86, "holder_name": "Rohit Menon", "phone": "+91-9988776655", "ip_address": "185.44.31.18", "email": "rohit.menon@protonmail.com", "bank_name": "Axis Bank"},
                {"id": "mule-hdfc-1102", "label": "HDFC ****1102", "node_type": "bank-account", "role": "intermediate", "default_layer": 2, "risk_score": 92, "holder_name": "R. Menon Trading", "phone": "+91-9988776655", "ip_address": "185.44.31.18", "email": "ops@rmenontrading.biz", "bank_name": "HDFC Bank"},
                {"id": "mule-sbi-9830", "label": "SBI ****9830", "node_type": "bank-account", "role": "intermediate", "default_layer": 2, "risk_score": 95, "holder_name": "N. Sharma Holdings", "phone": "+91-9810022211", "ip_address": "179.61.40.22", "email": "accounts@ns-holdings.biz", "bank_name": "SBI"},
                {"id": "shell-orbit-imports", "label": "Orbit Imports Pvt", "node_type": "entity", "role": "intermediate", "default_layer": 3, "risk_score": 97, "holder_name": "Orbit Imports Pvt", "phone": "+971-55-228-1990", "ip_address": "62.76.29.18", "email": "director@orbitimports.ae", "bank_name": "Corporate Entity"},
                {"id": "wallet-xf3a9", "label": "0xF3..a9", "node_type": "wallet", "role": "destination", "default_layer": 4, "risk_score": 99, "holder_name": "Unknown Wallet Owner", "phone": "+971-55-228-1990", "ip_address": "62.76.29.18", "email": "wallet-controller@protonmail.com", "bank_name": "Unhosted Wallet"},
                {"id": "offshore-seychelles-77", "label": "Offshore #77", "node_type": "bank-account", "role": "destination", "default_layer": 4, "risk_score": 97, "holder_name": "Oceancrest Holdings", "phone": "+248-445-7710", "ip_address": "41.214.75.61", "email": "ops@oceancrest.sc", "bank_name": "Seychelles Intl Bank"},
            ],
            "edges": [
                {"id": "C0441-E1", "case_id": "CASE-ML-2026-0441", "from_node_id": "acc-axis-3421", "to_node_id": "mule-hdfc-1102", "amount": 567000, "currency": "INR", "timestamp": parse_ts("2024-03-15T13:56:00Z"), "tx_ref": "TXN-8302"},
                {"id": "C0441-E2", "case_id": "CASE-ML-2026-0441", "from_node_id": "mule-hdfc-1102", "to_node_id": "mule-sbi-9830", "amount": 109500, "currency": "INR", "timestamp": parse_ts("2024-03-15T13:59:00Z"), "tx_ref": "TXN-LYR-4402"},
                {"id": "C0441-E3", "case_id": "CASE-ML-2026-0441", "from_node_id": "mule-sbi-9830", "to_node_id": "shell-orbit-imports", "amount": 890000, "currency": "INR", "timestamp": parse_ts("2024-03-15T14:04:00Z"), "tx_ref": "TXN-8298"},
                {"id": "C0441-E4", "case_id": "CASE-ML-2026-0441", "from_node_id": "shell-orbit-imports", "to_node_id": "wallet-xf3a9", "amount": 247500, "currency": "INR", "timestamp": parse_ts("2024-03-15T14:07:00Z"), "tx_ref": "TXN-8294"},
            ],
            "path_risks": [
                {"id": "C0441-P1", "case_id": "CASE-ML-2026-0441", "label": "Layering Detected", "risk_score": 96, "chain": ["acc-axis-3421", "mule-hdfc-1102", "mule-sbi-9830", "shell-orbit-imports", "wallet-xf3a9"], "explanation": "Funds moved through three ownership hops before crypto conversion and offshore exit."},
                {"id": "C0441-P2", "case_id": "CASE-ML-2026-0441", "label": "Smurfing Pattern", "risk_score": 91, "chain": ["acc-axis-3421", "mule-hdfc-1102", "mule-sbi-9830"], "explanation": "Amount split into sub-threshold transfers then re-aggregated into shell account."},
            ],
        },
        {
            "case_id": "CASE-ML-2026-0617",
            "title": "Cross-Border Mule Loop",
            "lead_agency": "State FIU Investigation Wing",
            "source_node_id": "source-kotak-9981",
            "destination_node_ids": ["wallet-xf3a9", "offshore-dubai-114", "crypto-mixer-arcus"],
            "nodes": [
                {"id": "source-kotak-9981", "label": "Kotak ****9981", "node_type": "bank-account", "role": "source", "default_layer": 1, "risk_score": 79, "holder_name": "Nikhil Sharma", "phone": "+91-9810022211", "ip_address": "103.22.15.91", "email": "n.sharma@safe-mail.org", "bank_name": "Kotak Bank"},
                {"id": "mule-sbi-9830", "label": "SBI ****9830", "node_type": "bank-account", "role": "intermediate", "default_layer": 2, "risk_score": 95, "holder_name": "N. Sharma Holdings", "phone": "+91-9810022211", "ip_address": "179.61.40.22", "email": "accounts@ns-holdings.biz", "bank_name": "SBI"},
                {"id": "shell-neon-trading", "label": "Neon Trade FZE", "node_type": "entity", "role": "intermediate", "default_layer": 3, "risk_score": 96, "holder_name": "Neon Trade FZE", "phone": "+971-55-228-1990", "ip_address": "62.76.29.18", "email": "control@neontrade-fze.com", "bank_name": "Corporate Entity"},
                {"id": "wallet-xf3a9", "label": "0xF3..a9", "node_type": "wallet", "role": "destination", "default_layer": 4, "risk_score": 99, "holder_name": "Unknown Wallet Owner", "phone": "+971-55-228-1990", "ip_address": "62.76.29.18", "email": "wallet-controller@protonmail.com", "bank_name": "Unhosted Wallet"},
                {"id": "offshore-dubai-114", "label": "Dubai #114", "node_type": "bank-account", "role": "destination", "default_layer": 4, "risk_score": 92, "holder_name": "Goldline Export FZE", "phone": "+971-55-228-1990", "ip_address": "62.76.29.18", "email": "funds@goldlinefze.ae", "bank_name": "Dubai Private Bank"},
                {"id": "crypto-mixer-arcus", "label": "Arcus Mixer", "node_type": "wallet", "role": "destination", "default_layer": 4, "risk_score": 98, "holder_name": "Arcus Mixing Service", "phone": "+44-020-8180-2271", "ip_address": "88.109.12.9", "email": "support@arcus-mixer.net", "bank_name": "Mixing Service"},
            ],
            "edges": [
                {"id": "C0617-E1", "case_id": "CASE-ML-2026-0617", "from_node_id": "source-kotak-9981", "to_node_id": "mule-sbi-9830", "amount": 274000, "currency": "INR", "timestamp": parse_ts("2024-03-15T14:15:00Z"), "tx_ref": "TXN-LYR-6171"},
                {"id": "C0617-E2", "case_id": "CASE-ML-2026-0617", "from_node_id": "mule-sbi-9830", "to_node_id": "shell-neon-trading", "amount": 271100, "currency": "INR", "timestamp": parse_ts("2024-03-15T14:17:00Z"), "tx_ref": "TXN-LYR-6172"},
                {"id": "C0617-E3", "case_id": "CASE-ML-2026-0617", "from_node_id": "shell-neon-trading", "to_node_id": "wallet-xf3a9", "amount": 89000, "currency": "INR", "timestamp": parse_ts("2024-03-15T14:20:00Z"), "tx_ref": "TXN-8296"},
            ],
            "path_risks": [
                {"id": "C0617-P1", "case_id": "CASE-ML-2026-0617", "label": "Circular Flow", "risk_score": 94, "chain": ["source-kotak-9981", "mule-sbi-9830", "shell-neon-trading", "wallet-xf3a9", "crypto-mixer-arcus", "mule-sbi-9830"], "explanation": "Loop-back transfer indicates laundering cycle to obscure ultimate beneficiary."},
                {"id": "C0617-P2", "case_id": "CASE-ML-2026-0617", "label": "Layering Detected", "risk_score": 92, "chain": ["source-kotak-9981", "mule-sbi-9830", "shell-neon-trading", "offshore-dubai-114"], "explanation": "Multi-hop transfer with shared control identifiers across shell and offshore nodes."},
            ],
        },
    ]
    db["investigation_cases"].insert_many(investigation_cases)

    add_pending_record(
        db,
        record_type="bootstrap",
        operation="seed",
        payload={
            "users": len(users),
            "transactions": len(transactions),
            "alerts": len(alerts),
            "investigation_cases": len(investigation_cases),
        },
    )
    mine_pending_records(db, miner="seed-engine")
