# onboarding/business_setup.py
# SMB knowledge base ingestion for DSPatch

import os
import json
from typing import List, Dict
import psycopg2
from pgvector.psycopg2 import register_vector

class BusinessSetup:
    """
    Ingests SMB business information and builds a pgvector knowledge base
    used by the AI agent to answer customer questions accurately.
    """

    def __init__(self, business_id: str):
        self.business_id = business_id
        self.db_url = os.getenv("DATABASE_URL")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "ibm/slate-125m-english-rtrvr")

    def load_business_profile(self, profile: Dict) -> bool:
        """
        Load business profile data including:
        - Business name, address, hours
        - Services offered
        - FAQs
        - Staff names
        - Pricing
        """
        required_fields = ["name", "phone", "hours", "services"]
        for field in required_fields:
            if field not in profile:
                raise ValueError(f"Missing required field: {field}")

        self._save_profile(profile)
        self._build_knowledge_chunks(profile)
        print(f"[BusinessSetup] Profile loaded for: {profile['name']}")
        return True

    def _save_profile(self, profile: Dict):
        """Persist business profile to database."""
        if not self.db_url:
            print(f"[BusinessSetup] No DB. Profile: {json.dumps(profile, indent=2)}")
            return
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO businesses (id, name, phone, hours, services, metadata)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET name=EXCLUDED.name, phone=EXCLUDED.phone,
                hours=EXCLUDED.hours, services=EXCLUDED.services,
                metadata=EXCLUDED.metadata
        """, (
            self.business_id, profile['name'], profile.get('phone'),
            json.dumps(profile.get('hours', {})),
            json.dumps(profile.get('services', [])),
            json.dumps({k: v for k, v in profile.items() if k not in ['name', 'phone', 'hours', 'services']})
        ))
        conn.commit()
        cur.close()
        conn.close()

    def _build_knowledge_chunks(self, profile: Dict):
        """Convert business profile into vector-searchable chunks."""
        chunks = []

        # Hours chunk
        hours_text = f"{profile['name']} is open: {json.dumps(profile.get('hours', {}))}"
        chunks.append(hours_text)

        # Services chunk
        for service in profile.get('services', []):
            chunks.append(f"{profile['name']} offers: {service}")

        # FAQ chunks
        for faq in profile.get('faqs', []):
            chunks.append(f"Q: {faq['question']} A: {faq['answer']}")

        print(f"[BusinessSetup] Built {len(chunks)} knowledge chunks for vector store.")
        # TODO: embed chunks and upsert to pgvector
        return chunks


if __name__ == "__main__":
    setup = BusinessSetup(business_id="demo-plumbing-co")
    setup.load_business_profile({
        "name": "Detroit Plumbing Co.",
        "phone": "+1-313-555-0100",
        "hours": {"mon-fri": "8am-6pm", "sat": "9am-3pm", "sun": "closed"},
        "services": ["Emergency plumbing", "Drain cleaning", "Water heater installation"],
        "faqs": [
            {"question": "Do you offer emergency services?", "answer": "Yes, 24/7 emergency line available."},
            {"question": "What areas do you serve?", "answer": "All of Metro Detroit and surrounding areas."},
        ]
    })
