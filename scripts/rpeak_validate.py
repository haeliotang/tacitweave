#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Frozen-protocol R-peak validation on MIT-BIH and LUDB.

Inputs are local PhysioNet extracts. This script writes temporary filtered
Float64 signals, invokes the TypeScript detector once, and evaluates both
detectors against expert annotations. It does not modify the frozen protocol.
"""
import argparse
import bisect
import json
import os
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import wfdb
from scipy.signal import butter, find_peaks, sosfiltfilt

BEAT_SYMBOLS = set('NLRBAaJSVrFejnE/fQ')
TOLERANCE_SECONDS = 0.15
MIT_ROOT = None
LUDB_ROOT = None


def filter_signal(values, fs):
    sos = butter(2, [5, 15], btype='bandpass', fs=fs, output='sos')
    return sosfiltfilt(sos, values)


def read_mit(record_id):
    record = wfdb.rdrecord(str(MIT_ROOT / record_id))
    names = [name.upper() for name in record.sig_name]
    channel = names.index('MLII') if 'MLII' in names else 0
    ann = wfdb.rdann(str(MIT_ROOT / record_id), 'atr')
    annotations = [int(sample) for sample, symbol in zip(ann.sample, ann.symbol) if symbol in BEAT_SYMBOLS]
    return record.p_signal[:, channel], record.fs, annotations, f'MIT-BIH lead {record.sig_name[channel]}'


def read_ludb(record_id):
    record = wfdb.rdrecord(str(LUDB_ROOT / record_id))
    names = [name.lower() for name in record.sig_name]
    channel = names.index('ii') if 'ii' in names else 0
    ann = wfdb.rdann(str(LUDB_ROOT / record_id), 'ii')
    annotations = [int(sample) for sample, symbol in zip(ann.sample, ann.symbol) if symbol == 'N']
    return record.p_signal[:, channel], record.fs, annotations, f'LUDB lead {record.sig_name[channel]}'


def match(peaks, annotations, tolerance):
    used = set()
    matched = 0
    errors = []
    for annotation in sorted(annotations):
        start = bisect.bisect_left(peaks, annotation - tolerance)
        end = bisect.bisect_right(peaks, annotation + tolerance)
        candidates = [(abs(peaks[index] - annotation), index) for index in range(start, end) if index not in used]
        if not candidates:
            continue
        error, index = min(candidates)
        used.add(index)
        matched += 1
        errors.append(error)
    return matched, len(annotations) - matched, len(peaks) - matched, errors


def metrics(tp, fn, fp, errors, fs):
    sensitivity = tp / (tp + fn) if tp + fn else None
    ppv = tp / (tp + fp) if tp + fp else None
    f1 = 2 * tp / (2 * tp + fp + fn) if (2 * tp + fp + fn) else None
    times = sorted(error / fs for error in errors)
    median = times[len(times) // 2] if times else None
    p95 = times[min(len(times) - 1, int(len(times) * 0.95))] if times else None
    return {'tp': tp, 'fn': fn, 'fp': fp, 'sensitivity': sensitivity, 'ppv': ppv, 'f1': f1, 'median_error_s': median, 'p95_error_s': p95}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mit-root', required=True)
    parser.add_argument('--ludb-root', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    global MIT_ROOT, LUDB_ROOT
    MIT_ROOT = Path(args.mit_root)
    LUDB_ROOT = Path(args.ludb_root)
    work = Path(tempfile.mkdtemp(prefix='rpeak-validation-'))
    items = []

    mit_ids = (MIT_ROOT / 'RECORDS').read_text().split()
    ludb_ids = (LUDB_ROOT / 'RECORDS').read_text().split()
    prepared = {}
    for record_id in mit_ids:
        signal, fs, annotations, lead = read_mit(record_id)
        filtered = filter_signal(signal, fs)
        path = work / f'mitdb-{record_id}.f64'
        filtered.astype('<f8').tofile(path)
        item_id = f'mitdb:{record_id}'
        items.append({'id': item_id, 'path': str(path), 'fs': int(fs)})
        prepared[item_id] = (fs, annotations, lead)
    for record_id in ludb_ids:
        base = record_id.split('/', 1)[-1]
        signal, fs, annotations, lead = read_ludb(record_id)
        filtered = filter_signal(signal, fs)
        path = work / f'ludb-{base}.f64'
        filtered.astype('<f8').tofile(path)
        item_id = f'ludb:{base}'
        items.append({'id': item_id, 'path': str(path), 'fs': int(fs)})
        prepared[item_id] = (fs, annotations, lead)

    index_path = work / 'index.json'
    peaks_path = work / 'ts-peaks.json'
    index_path.write_text(json.dumps(items))
    subprocess.run(['pnpm', 'exec', 'tsx', 'scripts/rpeak_ts_batch.ts', '--index', str(index_path), '--out', str(peaks_path)], check=True, cwd='.')
    ts_peaks = json.loads(peaks_path.read_text())
    results = {}
    for item in items:
        item_id = item['id']
        fs, annotations, lead = prepared[item_id]
        samples = np.fromfile(item['path'], dtype='<f8')
        tolerance = max(1, round(TOLERANCE_SECONDS * fs))
        ts_peak_list = ts_peaks[item_id]
        envelope = np.abs(samples)
        threshold = np.percentile(envelope, 85)
        scipy_peaks, _ = find_peaks(envelope, distance=int(0.25 * fs), height=threshold)
        ts = match(ts_peak_list, annotations, tolerance)
        scipy = match([int(value) for value in scipy_peaks], annotations, tolerance)
        results[item_id] = {
            'lead': lead,
            'fs': fs,
            'annotations': len(annotations),
            'ts': metrics(*ts, fs),
            'scipy': metrics(*scipy, fs),
        }
    all_results = {'version': 'rpeak-external-validation-v1', 'tolerance_seconds': TOLERANCE_SECONDS, 'records': results}
    Path(args.out).write_text(json.dumps(all_results, indent=2) + '\n')
    print(f'wrote {args.out} ({len(results)} records)')


if __name__ == '__main__':
    main()
