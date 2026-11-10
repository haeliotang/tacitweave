#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Minimal local LSL -> WebSocket bridge for the BCI-2 panel.

This is a reference example, not tested against hardware. It requires:
  pip install pylsl websockets

Then run, for example:
  python scripts/lsl_bridge.example.py --type EEG --kind heart_rate

The browser only connects to ws://127.0.0.1:8765; it never talks to LSL
directly and never uploads samples.
"""
import argparse
import asyncio
import json
import time

from pylsl import StreamInlet, resolve_byprop
import websockets


async def stream(websocket, inlet, kind, source_id):
    await websocket.send(json.dumps({
        "type": "hello",
        "sourceId": source_id,
        "kinds": [kind],
        "sampleRateHz": inlet.info().nominal_srate(),
    }))
    started = time.monotonic()
    while True:
        sample, _timestamp = inlet.pull_sample(timeout=0.1)
        if sample is None:
            await asyncio.sleep(0.01)
            continue
        await websocket.send(json.dumps({
            "type": "samples",
            "samples": [{
                "kind": kind,
                "value": float(sample[0]),
                "tMs": int((time.monotonic() - started) * 1000),
            }],
        }))


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", default="EEG")
    parser.add_argument("--name", default=None)
    parser.add_argument("--kind", default="heart_rate")
    parser.add_argument("--source-id", default="lsl-bridge")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    streams = resolve_byprop("type", args.type, timeout=5.0)
    if not streams:
        raise SystemExit(f"no LSL stream of type {args.type!r}")
    inlet = StreamInlet(streams[0])

    async def handler(websocket):
        await stream(websocket, inlet, args.kind, args.source_id)

    async with websockets.serve(handler, args.host, args.port):
        print(f"bridge on ws://{args.host}:{args.port}; waiting for the browser")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
