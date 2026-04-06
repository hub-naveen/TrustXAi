from app.schemas.api import UserPublic


def to_user_public(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"],
        email=user["email"],
        name=user["full_name"],
        institution=user["institution"],
        role=user["role"],
        avatar=user["avatar"],
    )


def clean_doc(document: dict | None) -> dict | None:
    if not document:
        return None
    cleaned = {k: v for k, v in document.items() if k != "_id"}
    return cleaned


def clean_docs(documents: list[dict]) -> list[dict]:
    return [clean_doc(document) for document in documents if clean_doc(document) is not None]
