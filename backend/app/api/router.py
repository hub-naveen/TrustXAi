from fastapi import APIRouter

from app.api.endpoints import admin, auth, blockchain, dashboard, federated, fraud, settings, transactions

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(transactions.router)
api_router.include_router(fraud.router)
api_router.include_router(blockchain.router)
api_router.include_router(federated.router)
api_router.include_router(admin.router)
api_router.include_router(settings.router)
