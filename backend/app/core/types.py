from enum import Enum


class RoleEnum(str, Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


class TransactionStatusEnum(str, Enum):
    approved = "approved"
    blocked = "blocked"
    flagged = "flagged"
    pending = "pending"


class SeverityEnum(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class ChainStatusEnum(str, Enum):
    confirmed = "confirmed"
    pending = "pending"


class InstitutionStatusEnum(str, Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class ModelStatusEnum(str, Enum):
    merged = "merged"
    validating = "validating"
    rejected = "rejected"
