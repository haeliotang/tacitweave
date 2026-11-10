// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
use crate::capture::RendererKind;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExperimentLog {
    version: String,
    experiments: Vec<Experiment>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Experiment {
    id: String,
    prompt: String,
    renderer_kind: RendererKind,
    model: Option<String>,
    sampled_at: String,
    scores: Scores,
    #[serde(default)]
    notes: String,
    capture_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Scores {
    e1: u8,
    e2: u8,
    e3: u8,
    e4: u8,
    e5: u8,
    e6: u8,
    e7: u8,
    e8: u8,
    e9: u8,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Summary {
    count: usize,
    average_scores: BTreeMap<String, f64>,
    weakest: Option<Weakest>,
}

#[derive(Debug, Serialize)]
struct Weakest {
    metric: String,
    label: String,
    score: f64,
}

const METRICS: [(&str, &str); 9] = [
    ("e1", "familiarity_cue"),
    ("e2", "character_continuity"),
    ("e3", "line_provenance"),
    ("e4", "audio"),
    ("e5", "world_coherence"),
    ("e6", "interaction"),
    ("e7", "provenance_and_playback"),
    ("e8", "privacy_and_ethics"),
    ("e9", "cost_and_duration"),
];

impl Experiment {
    fn score_values(&self) -> [u8; 9] {
        [
            self.scores.e1,
            self.scores.e2,
            self.scores.e3,
            self.scores.e4,
            self.scores.e5,
            self.scores.e6,
            self.scores.e7,
            self.scores.e8,
            self.scores.e9,
        ]
    }

    fn validate(&self) -> Result<(), String> {
        if self.id.trim().is_empty() {
            return Err("experiment id must not be empty".into());
        }
        if self.prompt.trim().is_empty() {
            return Err(format!("experiment {} prompt must not be empty", self.id));
        }
        if self.sampled_at.trim().is_empty() {
            return Err(format!(
                "experiment {} sampledAt must not be empty",
                self.id
            ));
        }
        if let Some(model) = &self.model {
            if model.trim().is_empty() {
                return Err(format!(
                    "experiment {} model must not be empty when present",
                    self.id
                ));
            }
        }
        if let Some(capture_id) = &self.capture_id {
            if capture_id.trim().is_empty() {
                return Err(format!(
                    "experiment {} captureId must not be empty when present",
                    self.id
                ));
            }
        }
        let _ = &self.notes;
        let _ = &self.renderer_kind;
        if self.score_values().iter().any(|score| *score > 4) {
            return Err(format!(
                "experiment {} scores must be between 0 and 4",
                self.id
            ));
        }
        Ok(())
    }
}

fn summarize(log: &ExperimentLog) -> Summary {
    let count = log.experiments.len();
    let mut average_scores = BTreeMap::new();
    let mut weakest: Option<Weakest> = None;
    for (index, (metric, label)) in METRICS.iter().enumerate() {
        let average = if count == 0 {
            0.0
        } else {
            let total: u32 = log
                .experiments
                .iter()
                .map(|experiment| experiment.score_values()[index] as u32)
                .sum();
            ((total as f64 / count as f64) * 100.0).round() / 100.0
        };
        average_scores.insert((*metric).to_string(), average);
        if count > 0
            && weakest
                .as_ref()
                .map(|current| average < current.score)
                .unwrap_or(true)
        {
            weakest = Some(Weakest {
                metric: (*metric).to_string(),
                label: (*label).to_string(),
                score: average,
            });
        }
    }
    Summary {
        count,
        average_scores,
        weakest,
    }
}

fn load(path: &str) -> Result<ExperimentLog, String> {
    let bytes = fs::read(path).map_err(|error| format!("cannot read {path}: {error}"))?;
    let log: ExperimentLog =
        serde_json::from_slice(&bytes).map_err(|error| format!("invalid JSON: {error}"))?;
    if log.version != "experiment-log-v1" {
        return Err(format!(
            "unsupported experiment log version: {}",
            log.version
        ));
    }
    for experiment in &log.experiments {
        experiment.validate()?;
    }
    Ok(log)
}

pub fn run(args: &[String]) -> Result<(), String> {
    let path = args
        .first()
        .ok_or_else(|| "usage: tacitweave-ops eval-validate <experiment-log.json>".to_string())?;
    let log = load(path)?;
    println!(
        "{}",
        serde_json::to_string_pretty(&summarize(&log)).map_err(|error| error.to_string())?
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXAMPLE: &str = include_str!("../../../../docs/evaluation/experiment-log.example.json");

    #[test]
    fn validates_and_summarizes_the_example_log() {
        let log: ExperimentLog = serde_json::from_str(EXAMPLE).expect("example parses");
        assert_eq!(log.version, "experiment-log-v1");
        for experiment in &log.experiments {
            experiment.validate().expect("example is valid");
        }
        let summary = summarize(&log);
        assert_eq!(summary.count, 1);
        assert_eq!(
            summary.weakest.as_ref().map(|item| item.metric.as_str()),
            Some("e3")
        );
    }

    #[test]
    fn rejects_out_of_range_scores_and_unknown_renderers() {
        let invalid_score = EXAMPLE.replace("\"e1\": 3", "\"e1\": 5");
        let log: ExperimentLog = serde_json::from_str(&invalid_score).expect("shape parses");
        assert!(log.experiments[0].validate().is_err());

        let unknown_renderer = EXAMPLE.replace("\"genie4\"", "\"other\"");
        assert!(serde_json::from_str::<ExperimentLog>(&unknown_renderer).is_err());
    }

    #[test]
    fn rejects_a_log_with_a_missing_metric() {
        let missing_metric = EXAMPLE.replace("\"e8\": 4,", "");
        assert!(serde_json::from_str::<ExperimentLog>(&missing_metric).is_err());
    }
}
