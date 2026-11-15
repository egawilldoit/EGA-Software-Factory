#!/usr/bin/env python3
"""Synthetic checks of the documented path contract, not host enforcement."""
from pathlib import Path
import tempfile
import unittest


def destination(env, boundary, explicit=None):
    if explicit is not None:
        target = Path(explicit)
    else:
        xdg = env.get("XDG_DATA_HOME", "")
        if xdg:
            root = Path(xdg)
        else:
            home = env.get("HOME", "")
            if not home:
                raise ValueError("HOME is unavailable")
            root = Path(home) / ".local/share"
        if not root.is_absolute():
            raise ValueError("data root must be absolute")
        target = root / "ega-factory/summaries/task.yaml"
    if not target.is_absolute() or not Path(boundary).is_absolute():
        raise ValueError("paths must be absolute")
    target = target.resolve(strict=False)
    if not target.is_relative_to(Path(boundary).resolve(strict=False)):
        raise ValueError("destination outside boundary")
    return target


class DestinationTests(unittest.TestCase):
    def test_precedence_and_containment(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home, xdg = root / "home", root / "xdg"
            base = {"HOME": str(home)}
            expected_home = home / ".local/share/ega-factory/summaries/task.yaml"
            self.assertEqual(destination(base, root), expected_home)
            self.assertEqual(destination({**base, "XDG_DATA_HOME": ""}, root), expected_home)
            self.assertEqual(destination({**base, "XDG_DATA_HOME": str(xdg)}, root),
                             xdg / "ega-factory/summaries/task.yaml")
            self.assertEqual(destination(base, root, root / "chosen.yaml"), root / "chosen.yaml")
            for env, boundary, explicit in [
                ({}, root, None),
                ({**base, "XDG_DATA_HOME": "relative"}, root, None),
                (base, xdg, None),
                (base, home, root / "home-other/task.yaml"),
                (base, home, home / "../outside.yaml"),
            ]:
                with self.subTest(env=env, boundary=boundary, explicit=explicit):
                    with self.assertRaises(ValueError):
                        destination(env, boundary, explicit)
            home.mkdir()
            (home / "escape").symlink_to(root, target_is_directory=True)
            with self.assertRaises(ValueError):
                destination(base, home, home / "escape/outside.yaml")
            (home / "inside").mkdir()
            (home / "link").symlink_to(home / "inside", target_is_directory=True)
            self.assertEqual(destination(base, home, home / "link/task.yaml"),
                             home / "inside/task.yaml")


if __name__ == "__main__":
    unittest.main()
