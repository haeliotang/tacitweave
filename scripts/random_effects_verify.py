#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Independent Python implementation of the Fisher-z DL random-effects check.

Reads a JSON array of {"rho": ..., "pairs": ...} and prints the group
estimate. This is a second implementation for reproducibility, not a new
empirical analysis or an approved interval.
"""
import argparse
import json
import math


def fisher_z(rho):
    return 0.5 * math.log((1 + rho) / (1 - rho))


def inverse_fisher_z(z):
    return math.tanh(z)


def random_effects(estimates):
    usable = [item for item in estimates if -1 < item["rho"] < 1 and item["pairs"] > 3]
    if len(usable) < 2:
        return None
    zs = [fisher_z(item["rho"]) for item in usable]
    variances = [1.0 / (item["pairs"] - 3) for item in usable]
    weights = [1.0 / value for value in variances]
    total = sum(weights)
    fixed_mean = sum(z * w for z, w in zip(zs, weights)) / total
    q = sum(w * (z - fixed_mean) ** 2 for z, w in zip(zs, weights))
    df = len(usable) - 1
    c = total - sum(w * w for w in weights) / total
    tau2 = max(0.0, (q - df) / c) if c > 0 else 0.0
    random_weights = [1.0 / (v + tau2) for v in variances]
    random_total = sum(random_weights)
    mean_z = sum(z * w for z, w in zip(zs, random_weights)) / random_total
    se = math.sqrt(1.0 / random_total)
    return {
        "k": len(usable),
        "meanRho": inverse_fisher_z(mean_z),
        "ciLowRho": inverse_fisher_z(mean_z - 1.96 * se),
        "ciHighRho": inverse_fisher_z(mean_z + 1.96 * se),
        "meanZ": mean_z,
        "ciLowZ": mean_z - 1.96 * se,
        "ciHighZ": mean_z + 1.96 * se,
        "tau2": tau2,
        "q": q,
        "i2": max(0.0, (q - df) / q) if q > 0 else 0.0,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="input_path", required=True)
    parser.add_argument("--out")
    args = parser.parse_args()
    with open(args.input_path, encoding="utf-8") as handle:
        estimates = json.load(handle)
    result = random_effects(estimates)
    text = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            handle.write(text)
    print(text, end="")


if __name__ == "__main__":
    main()
