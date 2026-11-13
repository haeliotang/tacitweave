#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Independent SciPy R-peak/HR check for QoL ECG records.

This intentionally uses a different detector from src/ecg-hrv.ts. It is a
pipeline cross-check, not a research-grade HRV validation.
"""
import argparse
import csv
import math
import re
import sys

import numpy as np
from scipy.signal import butter, find_peaks, sosfiltfilt


def detect(samples, fs=250):
    values = np.asarray(samples, dtype=float)
    if values.size < fs * 2 or not np.isfinite(values).all():
        return None
    sos = butter(2, [5, 15], btype='bandpass', fs=fs, output='sos')
    filtered = sosfiltfilt(sos, values)
    envelope = np.abs(filtered)
    threshold = np.percentile(envelope, 85)
    peaks, _ = find_peaks(envelope, distance=int(0.25 * fs), height=threshold)
    rr = np.diff(peaks) / fs
    rr = rr[(rr >= 0.3) & (rr <= 2.0)]
    if rr.size < 3:
        return None
    return {
        'peaks': int(peaks.size),
        'hr': float(60.0 / np.mean(rr)),
        'sdnn': float(np.std(rr, ddof=1) * 1000.0),
        'rmssd': float(np.sqrt(np.mean(np.diff(rr) ** 2)) * 1000.0),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--in', dest='input_path', required=True)
    args = parser.parse_args()
    rows = []
    with open(args.input_path, encoding='utf-8-sig', newline='') as handle:
        for row in csv.DictReader(handle):
            waveform = row.get('waveform_samples', '').strip()
            if not waveform:
                continue
            values = [float(value) for value in re.findall(r'-?\d+(?:\.\d+)?', waveform)]
            result = detect(values)
            rows.append((float(row['heart_rate']), result))
    usable = [(recorded, result) for recorded, result in rows if result is not None]
    errors = [abs(result['hr'] - recorded) for recorded, result in usable]
    print(f'records={len(rows)} detected={len(usable)}')
    print(f'mean_abs_hr_error={sum(errors)/len(errors):.2f} bpm')
    print(f'within_10_bpm={sum(1 for error in errors if error <= 10)}/{len(usable)}')
    print(f'mean_sdnn_ms={sum(result["sdnn"] for _, result in usable)/len(usable):.1f}')
    print('Independent SciPy detector cross-check only; no clinical or research-grade HRV claim.')


if __name__ == '__main__':
    main()
