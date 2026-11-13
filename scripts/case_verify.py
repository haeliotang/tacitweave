#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Independent second-environment check for the CASE canonical sessions.

This intentionally uses only the Python standard library and reimplements the
Spearman calculation. It verifies that the Node harness's per-participant
estimates can be reproduced without importing the Node implementation.
"""
import argparse
import json
import math
from collections import defaultdict


def ranks(values):
    ordered = sorted(range(len(values)), key=lambda index: values[index])
    result = [0.0] * len(values)
    index = 0
    while index < len(ordered):
        end = index + 1
        while end < len(ordered) and values[ordered[end]] == values[ordered[index]]:
            end += 1
        average = (index + 1 + end) / 2.0
        for position in range(index, end):
            result[ordered[position]] = average
        index = end
    return result


def spearman(left, right):
    if len(left) != len(right) or len(left) < 4:
        return None
    left_ranks, right_ranks = ranks(left), ranks(right)
    left_mean = sum(left_ranks) / len(left_ranks)
    right_mean = sum(right_ranks) / len(right_ranks)
    covariance = sum((a - left_mean) * (b - right_mean) for a, b in zip(left_ranks, right_ranks))
    left_var = sum((a - left_mean) ** 2 for a in left_ranks)
    right_var = sum((b - right_mean) ** 2 for b in right_ranks)
    if left_var == 0 or right_var == 0:
        return None
    return covariance / math.sqrt(left_var * right_var)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="input_path", required=True)
    parser.add_argument("--feature", default="gsrMeanMicroSiemens")
    parser.add_argument("--outcome", default="intensity")
    args = parser.parse_args()
    groups = defaultdict(list)
    with open(args.input_path, encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            session = json.loads(line)
            groups[session["participantCode"]].append(session)
    for participant, sessions in sorted(groups.items()):
        sessions.sort(key=lambda session: session["capturedAt"])
        pairs = [
            (session["signals"][args.feature], session["selfReport"][args.outcome])
            for session in sessions
            if args.feature in session.get("signals", {}) and args.outcome in session.get("selfReport", {})
        ]
        rho = spearman([pair[0] for pair in pairs], [pair[1] for pair in pairs])
        print(f"{participant}: paired={len(pairs)} rho={'n/a' if rho is None else f'{rho:.6f}'}")


if __name__ == "__main__":
    main()
