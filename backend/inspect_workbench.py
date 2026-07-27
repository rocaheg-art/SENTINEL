import asyncio
from sqlalchemy import inspect
import database
from database import init_db

async def inspect_db():
    await init_db()
    print(f"Connected database type: {database.db_type}")
    
    # We inspect the database schema using SQLAlchemy Inspector
    def run_inspection(connection):
        inspector = inspect(connection)
        tables = inspector.get_table_names()
        print(f"\nTables found in database: {tables}\n")
        
        for table in tables:
            print(f"=== Table: {table} ===")
            columns = inspector.get_columns(table)
            for col in columns:
                print(f"  - Column: {col['name']} ({col['type']}) | Nullable: {col['nullable']}")
            print("")

    # Run inspection in a thread-safe context for async engine
    async with database.engine.connect() as conn:
        await conn.run_sync(run_inspection)

if __name__ == "__main__":
    asyncio.run(inspect_db())
