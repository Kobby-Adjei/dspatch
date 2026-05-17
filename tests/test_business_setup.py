import copy
import io
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from onboarding.business_setup import (
    REQUIRED_FIELDS,
    VALID_INDUSTRIES,
    build_knowledge_chunks,
    load_business_profile,
    validate_profile,
)


EXAMPLES_DIR = Path(__file__).resolve().parents[1] / "onboarding" / "examples"


class BusinessProfileTests(unittest.TestCase):
    def setUp(self):
        self.profile = self.load_profile("demo-plumbing-co.json")

    def load_profile(self, filename):
        with redirect_stdout(io.StringIO()):
            return load_business_profile(str(EXAMPLES_DIR / filename))

    def build_chunks(self, profile):
        with redirect_stdout(io.StringIO()):
            return build_knowledge_chunks(profile)

    def test_sample_profiles_load_and_validate(self):
        expected_profiles = {
            "demo-plumbing-co.json": "home_services",
            "demo-restaurant.json": "hospitality",
            "demo-boutique.json": "retail",
        }

        for filename, industry in expected_profiles.items():
            with self.subTest(filename=filename):
                profile = self.load_profile(filename)
                self.assertEqual(profile["industry"], industry)
                self.assertIn(profile["industry"], VALID_INDUSTRIES)

    def test_missing_required_fields_raise_clear_errors(self):
        for field in REQUIRED_FIELDS:
            with self.subTest(field=field):
                profile = copy.deepcopy(self.profile)
                profile.pop(field)

                with self.assertRaisesRegex(ValueError, f"missing required field: '{field}'"):
                    validate_profile(profile)

    def test_invalid_industry_raises_clear_error(self):
        profile = copy.deepcopy(self.profile)
        profile["industry"] = "automotive"

        with self.assertRaisesRegex(ValueError, "invalid industry 'automotive'"):
            validate_profile(profile)

    def test_invalid_field_types_raise_clear_errors(self):
        cases = [
            ("hours", [], "'hours' must be an object"),
            ("services", [], "'services' must be a non-empty list"),
            ("routing_rules", [], "'routing_rules' must be an object"),
        ]

        for field, value, message in cases:
            with self.subTest(field=field):
                profile = copy.deepcopy(self.profile)
                profile[field] = value

                with self.assertRaisesRegex(ValueError, message):
                    validate_profile(profile)

    def test_knowledge_chunks_include_profile_context(self):
        chunks = self.build_chunks(self.profile)
        joined_chunks = "\n".join(chunks)

        self.assertIn("mon-fri: 8am-6pm", joined_chunks)
        self.assertIn("Emergency plumbing", joined_chunks)
        self.assertIn("Emergency visit starts at $149", joined_chunks)
        self.assertIn("Southfield", joined_chunks)
        self.assertIn("Do you offer emergency services?", joined_chunks)
        self.assertIn("flooding", joined_chunks)
        self.assertIn("create urgent ticket", joined_chunks)

    def test_missing_profile_path_raises_file_not_found(self):
        missing_path = EXAMPLES_DIR / "missing-profile.json"

        with self.assertRaisesRegex(FileNotFoundError, "profile not found"):
            load_business_profile(str(missing_path))


if __name__ == "__main__":
    unittest.main()
