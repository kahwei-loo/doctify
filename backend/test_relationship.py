"""
Simple script to test User-Document relationships
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.db.models.user import User
from app.db.models.document import Document

async def test_relationships():
    # Create async engine for development database (use Docker service hostname)
    engine = create_async_engine(
        "postgresql+asyncpg://doctify:doctify_dev_password@doctify-postgres:5432/doctify_development",
        echo=False  # Disable SQL echo for cleaner output
    )

    async_session = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
    )

    async with async_session() as session:
        try:
            # Try to query a user
            result = await session.execute(select(User).limit(1))
            user = result.scalar_one_or_none()

            if user:
                print(f"✅ Successfully queried user: {user.email}")
                print(f"✅ User has {len(user.documents)} documents")
            else:
                print("No users found in database")

        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_relationships())
