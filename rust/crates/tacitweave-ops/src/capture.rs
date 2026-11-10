// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use std::str::FromStr;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RendererKind {
    Procedural,
    Genie4,
    Marble,
    Captured,
    Symbolic,
}

impl FromStr for RendererKind {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "procedural" => Ok(Self::Procedural),
            "genie4" => Ok(Self::Genie4),
            "marble" => Ok(Self::Marble),
            "captured" => Ok(Self::Captured),
            "symbolic" => Ok(Self::Symbolic),
            other => Err(format!("unsupported renderer kind: {other}")),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureProvenance {
    pub version: String,
    pub capture_id: String,
    pub renderer_kind: RendererKind,
    pub mime_type: String,
    pub duration_sec: f64,
    pub sha256: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_hash: Option<String>,
    pub synth_id: bool,
    pub created_at: String,
}

impl CaptureProvenance {
    pub fn validate(&self) -> Result<(), String> {
        if self.version != "capture-v1" {
            return Err("unsupported capture version".into());
        }
        if self.capture_id.trim().is_empty() {
            return Err("captureId must not be empty".into());
        }
        if self.mime_type.trim().is_empty() {
            return Err("mimeType must not be empty".into());
        }
        if !self.duration_sec.is_finite() || self.duration_sec <= 0.0 {
            return Err("durationSec must be a positive finite number".into());
        }
        if self.sha256.len() != 64 || !self.sha256.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err("sha256 must be a 64-character hex string".into());
        }
        if OffsetDateTime::parse(&self.created_at, &Rfc3339).is_err() {
            return Err("createdAt must be an RFC 3339 timestamp".into());
        }
        Ok(())
    }
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

pub fn hash_file(path: &Path) -> Result<String, String> {
    let file =
        File::open(path).map_err(|error| format!("cannot open {}: {error}", path.display()))?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = reader
            .read(&mut buffer)
            .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

#[allow(clippy::too_many_arguments)]
pub fn build_capture(
    media_path: &Path,
    capture_id: &str,
    renderer_kind: RendererKind,
    mime_type: &str,
    duration_sec: f64,
    url: Option<String>,
    model: Option<String>,
    prompt_hash: Option<String>,
    synth_id: bool,
    created_at: Option<String>,
) -> Result<CaptureProvenance, String> {
    let created_at = match created_at {
        Some(value) => {
            let parsed = OffsetDateTime::parse(&value, &Rfc3339)
                .map_err(|_| "createdAt must be an RFC 3339 timestamp".to_string())?;
            parsed.format(&Rfc3339).map_err(|error| error.to_string())?
        }
        None => OffsetDateTime::now_utc()
            .format(&Rfc3339)
            .map_err(|error| error.to_string())?,
    };
    let capture = CaptureProvenance {
        version: "capture-v1".into(),
        capture_id: capture_id.to_string(),
        renderer_kind,
        mime_type: mime_type.to_string(),
        duration_sec,
        sha256: hash_file(media_path)?,
        url,
        model,
        prompt_hash,
        synth_id,
        created_at,
    };
    capture.validate()?;
    Ok(capture)
}

pub fn verify_capture(capture: &CaptureProvenance, media_path: &Path) -> Result<(), String> {
    capture.validate()?;
    let actual = hash_file(media_path)?;
    if actual != capture.sha256 {
        return Err(format!(
            "capture hash mismatch: expected {}, got {}",
            capture.sha256, actual
        ));
    }
    Ok(())
}

pub fn run_verify(args: &[String]) -> Result<(), String> {
    let capture_path = args.first().ok_or_else(|| {
        "usage: tacitweave-ops capture-verify <capture.json> <media-file>".to_string()
    })?;
    let media_path = args.get(1).ok_or_else(|| {
        "usage: tacitweave-ops capture-verify <capture.json> <media-file>".to_string()
    })?;
    let raw = std::fs::read_to_string(capture_path)
        .map_err(|error| format!("cannot read {capture_path}: {error}"))?;
    let capture: CaptureProvenance =
        serde_json::from_str(&raw).map_err(|error| format!("invalid capture JSON: {error}"))?;
    verify_capture(&capture, Path::new(media_path))?;
    println!("capture verified: {}", capture.capture_id);
    Ok(())
}

pub fn run(args: &[String]) -> Result<(), String> {
    let path = args.first().filter(|arg| !arg.starts_with("--")).ok_or_else(|| {
        "usage: tacitweave-ops capture-hash <file> --id <id> --renderer <kind> --mime <type> --duration <seconds> [--url <url>] [--model <id>] [--prompt-hash <sha256>] [--synth-id] [--created-at <RFC3339>]".to_string()
    })?;
    let id = required_value(args, "--id")?;
    let renderer = required_value(args, "--renderer")?.parse::<RendererKind>()?;
    let mime = required_value(args, "--mime")?;
    let duration = required_value(args, "--duration")?
        .parse::<f64>()
        .map_err(|_| "duration must be a number".to_string())?;
    let capture = build_capture(
        Path::new(path),
        &id,
        renderer,
        &mime,
        duration,
        value(args, "--url"),
        value(args, "--model"),
        value(args, "--prompt-hash"),
        args.iter().any(|arg| arg == "--synth-id"),
        value(args, "--created-at"),
    )?;
    println!(
        "{}",
        serde_json::to_string_pretty(&capture).map_err(|error| error.to_string())?
    );
    Ok(())
}

fn value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|arg| arg == name)
        .and_then(|index| args.get(index + 1))
        .cloned()
}

fn required_value(args: &[String], name: &str) -> Result<String, String> {
    value(args, name).ok_or_else(|| format!("{name} is required"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_known_bytes() {
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn validates_a_complete_capture() {
        let capture = CaptureProvenance {
            version: "capture-v1".into(),
            capture_id: "capture-1".into(),
            renderer_kind: RendererKind::Captured,
            mime_type: "video/mp4".into(),
            duration_sec: 75.0,
            sha256: "a".repeat(64),
            url: Some("/capture.mp4".into()),
            model: Some("synthetic".into()),
            prompt_hash: None,
            synth_id: true,
            created_at: "2026-11-01T00:00:00Z".into(),
        };
        assert!(capture.validate().is_ok());
    }

    #[test]
    fn verifies_media_hash_and_rejects_mismatch() {
        let path =
            std::env::temp_dir().join(format!("tacitweave-capture-{}.bin", std::process::id()));
        std::fs::write(&path, b"abc").expect("write fixture");
        let capture = CaptureProvenance {
            version: "capture-v1".into(),
            capture_id: "capture-1".into(),
            renderer_kind: RendererKind::Captured,
            mime_type: "video/mp4".into(),
            duration_sec: 75.0,
            sha256: sha256_hex(b"abc"),
            url: Some("/capture.mp4".into()),
            model: None,
            prompt_hash: None,
            synth_id: true,
            created_at: "2026-11-01T00:00:00Z".into(),
        };
        assert!(verify_capture(&capture, &path).is_ok());
        std::fs::write(&path, b"abd").expect("rewrite fixture");
        assert!(verify_capture(&capture, &path).is_err());
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn rejects_malformed_capture_fields() {
        let mut capture = CaptureProvenance {
            version: "capture-v1".into(),
            capture_id: "capture-1".into(),
            renderer_kind: RendererKind::Genie4,
            mime_type: "video/mp4".into(),
            duration_sec: 75.0,
            sha256: "a".repeat(64),
            url: None,
            model: None,
            prompt_hash: None,
            synth_id: false,
            created_at: "2026-11-01T00:00:00Z".into(),
        };
        capture.duration_sec = 0.0;
        assert!(capture.validate().is_err());
        capture.duration_sec = 75.0;
        capture.sha256 = "short".into();
        assert!(capture.validate().is_err());
        capture.sha256 = "a".repeat(64);
        capture.created_at = "not-a-date".into();
        assert!(capture.validate().is_err());
    }
}
