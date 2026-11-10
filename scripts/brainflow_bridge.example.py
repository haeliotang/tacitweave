#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Reference BrainFlow / OpenBCI -> JSONL adapter for scripts/bci3-bridge.ts.

This is an example, not a hardware validation. It requires:
    pip install brainflow

Run it as a local daemon and pipe stdout into the bridge:
    python scripts/brainflow_bridge.example.py --board 0 --kind eda --channel 0 \
      | pnpm bci:bridge --port 8765 --token local-dev-token --rate 1

Only derived samples are emitted; no raw neural data is written by this script.
The `--kind`/`--channel` mapping is the operator's responsibility and must be
documented before any research use. Stop the stream with Ctrl-C.
"""
import argparse
import json
import sys
import time

from brainflow.board_shim import BoardShim, BrainFlowInputParams


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--board", type=int, default=0, help="BrainFlow board id")
    parser.add_argument("--kind", default="eda", help="Tacitweave signal kind")
    parser.add_argument("--channel", type=int, default=0, help="BrainFlow channel index")
    parser.add_argument("--source-id", default="brainflow-bridge")
    parser.add_argument("--interval-ms", type=int, default=100)
    args = parser.parse_args()

    params = BrainFlowInputParams()
    board = BoardShim(args.board, params)
    board.prepare_session()
    board.start_stream()
    started = time.monotonic()
    try:
        while True:
            data = board.get_current_board_data(1)
            if data.size:
                value = float(data[args.channel][-1])
                elapsed_ms = int((time.monotonic() - started) * 1000)
                print(json.dumps({
                    "type": "samples",
                    "sourceId": args.source_id,
                    "samples": [{"kind": args.kind, "value": value, "tMs": elapsed_ms}],
                }), flush=True)
            time.sleep(max(args.interval_ms, 10) / 1000)
    except KeyboardInterrupt:
        pass
    finally:
        board.stop_stream()
        board.release_session()
        print("brainflow adapter stopped", file=sys.stderr)


if __name__ == "__main__":
    main()
