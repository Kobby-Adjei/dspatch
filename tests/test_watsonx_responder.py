import os
import unittest
from unittest.mock import patch

from agent import watsonx


class WatsonxResponderTest(unittest.TestCase):
    def setUp(self):
        self.profile = {
            "name": "Detroit Plumbing Co.",
            "hours": {"mon-fri": "8am-6pm", "sat": "9am-3pm"},
        }

    def test_generate_response_uses_fallback_when_watsonx_disabled(self):
        with patch.dict(os.environ, {"WATSONX_ENABLED": "false"}, clear=True), patch("builtins.print"):
            response = watsonx.generate_response(
                business_profile=self.profile,
                customer_message="My basement is flooding.",
                urgency="emergency",
            )

        self.assertIn("Your emergency request has been received", response)
        self.assertIn("Detroit Plumbing Co.", response)

    def test_generate_response_falls_back_when_watsonx_enabled_but_unavailable(self):
        with patch.dict(os.environ, {"WATSONX_ENABLED": "true"}, clear=True), patch("builtins.print"):
            with patch.object(watsonx, "APIClient", None), patch.object(watsonx, "Credentials", None):
                response = watsonx.generate_response(
                    business_profile=self.profile,
                    customer_message="What are your hours?",
                    urgency="low",
                )

        self.assertIn("Detroit Plumbing Co. is open", response)
        self.assertIn("mon-fri: 8am-6pm", response)

    def test_build_support_prompt_includes_context_and_instructions(self):
        prompt = watsonx.build_support_prompt(
            business_profile=self.profile,
            customer_message="Do you serve Southfield?",
            context_chunks=["Detroit Plumbing Co. serves Southfield."],
        )

        self.assertIn("Detroit Plumbing Co.", prompt)
        self.assertIn("Detroit Plumbing Co. serves Southfield.", prompt)
        self.assertIn('Customer message: "Do you serve Southfield?"', prompt)
        self.assertIn("Never make up pricing", prompt)


if __name__ == "__main__":
    unittest.main()
