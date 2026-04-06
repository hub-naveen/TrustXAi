from __future__ import annotations

from functools import lru_cache

import mongomock
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.config import settings


@lru_cache
def get_mongo_client() -> MongoClient:
    # Use real MongoDB when available, fallback to mongomock for local/dev resilience.
    if settings.MONGODB_URL.startswith("mongomock://"):
        return mongomock.MongoClient()

    client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
    try:
        client.admin.command("ping")
        return client
    except PyMongoError:
        return mongomock.MongoClient()


@lru_cache
def get_database() -> Database:
    return get_mongo_client()[settings.MONGODB_DB_NAME]


def get_db() -> Database:
    return get_database()
