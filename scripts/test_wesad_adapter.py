#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Synthetic fixture test for the WESAD adapter contract only."""
import json
import pickle
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np


class WesadAdapterContractTest(unittest.TestCase):
    def test_synthetic_fixture(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subject = root / 'S2'
            subject.mkdir()
            labels = np.array([1, 1, 2, 2, 3, 3])
            data = {
                'subject': 'S2',
                'label': labels,
                'signal': {
                    'chest': {
                        'ECG': np.array([1, 3, 10, 20, 100, 300], dtype=float),
                        'EDA': np.array([2, 4, 20, 40, 200, 400], dtype=float),
                        'RESP': np.array([1, 1, 1, 1, 1, 1], dtype=float),
                        'TEMP': np.array([30, 30, 31, 31, 32, 32], dtype=float),
                    },
                    'wrist': {
                        'BVP': np.array([5, 5, 6, 6, 7, 7], dtype=float),
                        'EDA': np.array([2, 2, 3, 3, 4, 4], dtype=float),
                        'TEMP': np.array([28, 28, 29, 29, 30, 30], dtype=float),
                    },
                },
            }
            with open(subject / 'S2.pkl', 'wb') as handle:
                pickle.dump(data, handle)
            out = root / 'canonical.jsonl'
            subprocess.run([sys.executable, str(Path(__file__).with_name('wesad_adapter.py')),
                            '--root', str(root), '--out', str(out)], check=True, capture_output=True)
            sessions = [json.loads(line) for line in out.read_text().splitlines()]
            self.assertEqual(len(sessions), 3)
            baseline = next(item for item in sessions if item['sessionId'] == 's2-baseline')
            self.assertEqual(baseline['signals']['chestEcgMean'], 2.0)
            self.assertEqual(baseline['signals']['chestEdaMean'], 3.0)
            self.assertEqual(baseline['selfReport'], {})
            stress = next(item for item in sessions if item['sessionId'] == 's2-stress')
            self.assertEqual(stress['signals']['chestEcgMean'], 15.0)


if __name__ == '__main__':
    unittest.main()
