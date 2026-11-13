#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""WESAD canonical adapter contract (local-only public data).

This adapter expects the official WESAD layout:

  WESAD/S2/S2.pkl
  WESAD/S3/S3.pkl
  ...

Each pickle is a dict with `subject`, `signal` and `label` (or `labels`).
It aggregates chest/wrist signal means per condition and writes canonical
sessions. It does not treat WESAD condition labels as self-reported experience,
and no WESAD data is bundled or redistributed.

License: WESAD permits scientific, non-commercial use with attribution. Check
the original site before downloading. This adapter has only been tested with a
synthetic WESAD-shaped pickle, not the real 2.5 GB archive.
"""
import argparse
import json
import pickle
from pathlib import Path

import numpy as np

CONDITIONS = {1: 'baseline', 2: 'stress', 3: 'amusement'}
CHEST = {'ECG': 'chestEcgMean', 'EDA': 'chestEdaMean', 'RESP': 'chestRespirationMean', 'TEMP': 'chestTempMean'}
WRIST = {'BVP': 'wristBvpMean', 'EDA': 'wristEdaMean', 'TEMP': 'wristTempMean'}


def mean_for(signal, labels, condition):
    mask = labels == condition
    if not np.any(mask):
        return None
    values = np.asarray(signal)
    if values.ndim > 1:
        values = values[:, 0]
    # Wrist signals are 64 Hz while labels are 700 Hz; do not silently
    # apply chest-rate labels to a different sampling rate.
    if values.shape[0] != labels.shape[0]:
        return None
    selected = values[mask]
    if selected.size == 0:
        return None
    return float(np.mean(selected))


def read_subject(path):
    with open(path, 'rb') as handle:
        data = pickle.load(handle, encoding='latin1')
    labels = np.asarray(data.get('label', data.get('labels')))
    signal = data.get('signal', {})
    chest = signal.get('chest', {})
    wrist = signal.get('wrist', {})
    return labels, chest, wrist


def build_sessions(root, subjects):
    sessions = []
    for subject_dir in sorted(root.glob('S*')):
        if not subject_dir.is_dir():
            continue
        subject = subject_dir.name
        if subjects and subject not in subjects:
            continue
        path = subject_dir / f'{subject}.pkl'
        if not path.is_file():
            continue
        labels, chest, wrist = read_subject(path)
        for condition, name in CONDITIONS.items():
            signals = {}
            for key, output in CHEST.items():
                value = mean_for(chest.get(key, []), labels, condition)
                if value is not None:
                    signals[output] = value
            for key, output in WRIST.items():
                value = mean_for(wrist.get(key, []), labels, condition)
                if value is not None:
                    signals[output] = value
            if not signals:
                continue
            sessions.append({
                'version': 'lsm0-public-session-v1',
                'participantCode': f'P{subject[1:].zfill(3)}',
                'sessionId': f'{subject.lower()}-{name}',
                'capturedAt': f'2018-10-01T00:00:00.000Z',
                'signals': signals,
                'selfReport': {},
                'quality': {'usable': True},
                'source': {'dataset': 'WESAD', 'adapterVersion': 'wesad-canonical-v1'},
            })
    return sessions


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--subjects', default='')
    args = parser.parse_args()
    subjects = {value.strip() for value in args.subjects.split(',') if value.strip()}
    sessions = build_sessions(Path(args.root), subjects)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as handle:
        for session in sessions:
            handle.write(json.dumps(session) + '\n')
    print(f'wrote {len(sessions)} sessions to {out}')
    print('WESAD condition labels are not self-report; no hypothesis test is performed.')


if __name__ == '__main__':
    main()
