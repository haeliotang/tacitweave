#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Compare the Python second implementation with the Node reference values."""
import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

EXPECTED = {
    "k": 3,
    "meanRho": 0.3561713920075984,
    "ciLowRho": -0.004707990199111427,
    "ciHighRho": 0.6349677502959182,
    "tau2": 0.0,
    "q": 0.5411806999057873,
}


class RandomEffectsSecondImplementationTest(unittest.TestCase):
    def test_matches_node_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "estimates.json"
            source.write_text(json.dumps([
                {"rho": 0.2, "pairs": 12},
                {"rho": 0.5, "pairs": 12},
                {"rho": 0.35, "pairs": 12},
            ]))
            output = subprocess.run(
                [sys.executable, str(Path(__file__).with_name("random_effects_verify.py")), "--in", str(source)],
                check=True, capture_output=True, text=True,
            )
            result = json.loads(output.stdout)
            for key, expected in EXPECTED.items():
                self.assertTrue(math.isclose(result[key], expected, rel_tol=1e-12, abs_tol=1e-12), key)


if __name__ == "__main__":
    unittest.main()
