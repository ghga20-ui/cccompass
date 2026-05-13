import json
import tempfile
import unittest
from pathlib import Path

import sync_school_data


class SyncSchoolDataTests(unittest.TestCase):
    def test_sync_school_json_copies_root_data_to_app_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "data" / "school.json"
            target = root / "app" / "src" / "data" / "json" / "school.json"
            source.parent.mkdir(parents=True)
            target.parent.mkdir(parents=True)

            source.write_text(
                json.dumps({"schoolName": "효자고등학교", "cohorts": {"2026": {}}}, ensure_ascii=False),
                encoding="utf-8",
            )
            target.write_text(
                json.dumps({"schoolName": "old", "cohorts": {}}, ensure_ascii=False),
                encoding="utf-8",
            )

            result = sync_school_data.sync_school_json(root)

            self.assertTrue(result.changed)
            self.assertEqual(target.read_text(encoding="utf-8"), source.read_text(encoding="utf-8"))

    def test_check_school_json_returns_false_when_files_differ(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "data" / "school.json"
            target = root / "app" / "src" / "data" / "json" / "school.json"
            source.parent.mkdir(parents=True)
            target.parent.mkdir(parents=True)

            source.write_text('{"schoolName":"source","cohorts":{}}', encoding="utf-8")
            target.write_text('{"schoolName":"target","cohorts":{}}', encoding="utf-8")

            self.assertFalse(sync_school_data.check_school_json(root))
            self.assertEqual(target.read_text(encoding="utf-8"), '{"schoolName":"target","cohorts":{}}')

    def test_sync_rejects_invalid_source_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "data" / "school.json"
            target = root / "app" / "src" / "data" / "json" / "school.json"
            source.parent.mkdir(parents=True)
            target.parent.mkdir(parents=True)

            source.write_text("{invalid", encoding="utf-8")
            target.write_text('{"schoolName":"target","cohorts":{}}', encoding="utf-8")

            with self.assertRaises(ValueError):
                sync_school_data.sync_school_json(root)

            self.assertEqual(target.read_text(encoding="utf-8"), '{"schoolName":"target","cohorts":{}}')


if __name__ == "__main__":
    unittest.main()
