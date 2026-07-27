import asyncio
from sqlalchemy.future import select
from database import get_async_session, init_db, db_type
from models import Publicacion
import pandas as pd
from scipy.stats import pearsonr
from collections import Counter
import re

# Stopwords set
STOPWORDS = {"el", "la", "los", "las", "un", "una", "unos", "unas", "y", "en", "que", "de", "por", "para", "con"}

async def test_endpoints():
    await init_db()
    print("Testing calculations...")
    
    async for session in get_async_session():
        # 1. Semantic tree test calculation
        stmt = select(Publicacion.contenido, Publicacion.categoria, Publicacion.severidad).limit(50)
        res = await session.execute(stmt)
        records = res.all()
        print(f"Loaded {len(records)} test records.")
        
        tree_data = {}
        for content, category, severity in records:
            if not category or not content:
                continue
            cat = category.strip().capitalize()
            if cat not in tree_data:
                tree_data[cat] = {"words": [], "total_severity": 0, "count": 0}
            words = re.findall(r'\b\w+\b', content.lower())
            filtered = [w for w in words if w not in STOPWORDS and len(w) > 3]
            tree_data[cat]["words"].extend(filtered)
            tree_data[cat]["total_severity"] += (severity or 0)
            tree_data[cat]["count"] += 1
            
        print("Semantic Categories Processed:")
        for cat, data in tree_data.items():
            top = Counter(data["words"]).most_common(3)
            print(f"  - {cat}: count={data['count']}, top words={top}")
            
        # 2. Multivariate Correlation test
        stmt_corr = select(
            Publicacion.engagement_total,
            Publicacion.severidad,
            Publicacion.comentarios,
            Publicacion.compartidos
        ).limit(100)
        res_corr = await session.execute(stmt_corr)
        corr_records = res_corr.all()
        
        df = pd.DataFrame(corr_records, columns=["engagement", "severity", "comments", "shares"])
        df = df.fillna(0)
        corr = df.corr(method="pearson").to_dict()
        print("\nCorrelation coefficients matrix preview:")
        print(f"  - engagement vs severity: {corr['engagement']['severity']}")
        print(f"  - comments vs shares: {corr['comments']['shares']}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
