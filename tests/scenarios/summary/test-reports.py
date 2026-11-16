#!/usr/bin/env python3
"""Exercise structured report validation, including retained schema 1 support."""
from copy import deepcopy
from pathlib import Path
import subprocess
import tempfile
import unittest
import yaml

HERE = Path(__file__).resolve().parent


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.report = yaml.safe_load((HERE / "fixtures/opt-in-synthetic.yaml").read_text())
        self.report.update({
            "schema_version": 2,
            "recorded_at": "2026-11-16T16:00:00Z",
            "links": {"task": None, "thread": "t3-thread://v2/example/thread", "pr": None},
            "checks": [
                {"name": "focused tests", "status": "passed", "evidence": "synthetic revision: 3 passed"},
                {"name": "browser", "status": "not-checked", "evidence": "no disposable browser available"},
                {"name": "optional CI", "status": "skipped", "evidence": "path filter did not match"},
                {"name": "baseline regression", "status": "failed", "evidence": "expected failure on base"},
            ],
            "review_detail": {"independence": "same-agent", "evidence": "self-review, no independent reviewer"},
            "delivery": {"merged": "yes", "deployed": "unknown", "verified_live": "unknown", "evidence": "merge observed; automatic deployment not inspected"},
            "blockers": ["Browser evidence unavailable"],
            "rework": ["Baseline regression failed, then passed after the fix"],
        })

    def valid(self, report):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "report.yaml"
            target.write_text(yaml.safe_dump(report))
            result = subprocess.run(["bash", str(HERE / "validate-summary.sh"), str(target)], capture_output=True)
            return result.returncode == 0

    def test_legacy_report(self):
        self.assertTrue(self.valid(yaml.safe_load((HERE / "fixtures/opt-in-synthetic.yaml").read_text())))

    def test_all_statuses_and_unknown_rollout(self):
        self.assertTrue(self.valid(self.report))

    def test_missing_sections(self):
        for key in ("recorded_at", "links", "checks", "review_detail", "delivery", "blockers", "rework"):
            with self.subTest(key=key):
                report = deepcopy(self.report)
                del report[key]
                self.assertFalse(self.valid(report))

    def test_unknown_status_and_missing_evidence(self):
        for change in ({"status": "green"}, {"evidence": ""}):
            report = deepcopy(self.report)
            report["checks"][0].update(change)
            self.assertFalse(self.valid(report))

    def test_delivery_requires_explicit_strings(self):
        for value in (True, False, "passed", None):
            report = deepcopy(self.report)
            report["delivery"]["deployed"] = value
            self.assertFalse(self.valid(report))

    def test_review_independence(self):
        self.report["review_detail"]["independence"] = "approved"
        self.assertFalse(self.valid(self.report))

    def test_timestamp_and_links(self):
        for stamp in ("yesterday", "2026-11-16T16:00:00", "2026-11-16T16:00:00+01:00"):
            self.report["recorded_at"] = stamp
            self.assertFalse(self.valid(self.report))
        self.setUp()
        self.report["links"]["pr"] = "https://user:password@example.invalid/pr/1"
        self.assertFalse(self.valid(self.report))

    def test_nested_private_content(self):
        self.report["checks"][0]["prompt"] = "private text"
        self.assertFalse(self.valid(self.report))

    def test_link_query_privacy(self):
        for key in ('token', 'access_token', 'sig', 'X-Amz-Signature', 'api_key', '%74oken', 'code'):
            with self.subTest(key=key):
                self.report['links']['task'] = f'https://example.invalid/issues/1?{key}=synthetic'
                self.assertFalse(self.valid(self.report))
        self.report['links']['task'] = 'https://example.invalid/issues/1?page=2'
        self.assertTrue(self.valid(self.report))


if __name__ == "__main__":
    unittest.main()
