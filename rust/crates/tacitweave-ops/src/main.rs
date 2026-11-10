// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
use tacitweave_ops::{capture, eval, genie};

const HELP: &str = r#"tacitweave-ops

Usage:
  tacitweave-ops capture-hash <file> --id <id> --renderer <procedural|genie4|marble|captured|symbolic> --mime <type> --duration <seconds> [--url <url>] [--model <id>] [--prompt-hash <sha256>] [--synth-id] [--created-at <RFC3339>]
  tacitweave-ops capture-verify <capture.json> <media-file>
  tacitweave-ops eval-validate <experiment-log.json>
  tacitweave-ops genie-status

All commands are local-only; genie-status never calls a network service.
"#;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let result = match args.first().map(String::as_str) {
        None | Some("--help") | Some("-h") => {
            print!("{HELP}");
            Ok(())
        }
        Some("capture-hash") => capture::run(&args[1..]),
        Some("capture-verify") => capture::run_verify(&args[1..]),
        Some("eval-validate") => eval::run(&args[1..]),
        Some("genie-status") => genie::run(&args[1..]),
        Some(command) => Err(format!("unknown command: {command}\n\n{HELP}")),
    };
    if let Err(message) = result {
        eprintln!("{message}");
        std::process::exit(1);
    }
}
