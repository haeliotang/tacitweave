// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GenieStatus {
    pub configured: bool,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

pub fn status_from(env: &BTreeMap<String, String>) -> GenieStatus {
    let api_key = env.get("GENIE_API_KEY").map(String::as_str).unwrap_or("");
    let base_url = env.get("GENIE_BASE_URL").map(String::as_str).unwrap_or("");
    let model_id = env.get("GENIE_MODEL_ID").map(String::as_str).unwrap_or("");
    if api_key.trim().is_empty()
        || model_id.trim().is_empty()
        || !(base_url.starts_with("http://") || base_url.starts_with("https://"))
    {
        return GenieStatus {
            configured: false,
            reason: "GENIE_API_KEY, GENIE_BASE_URL (http/https) and GENIE_MODEL_ID must all be configured; no network request is made.".into(),
            model_id: None,
            base_url: None,
        };
    }
    GenieStatus {
        configured: true,
        reason: "configuration is present; account and API access still need verification.".into(),
        model_id: Some(model_id.to_string()),
        base_url: Some(base_url.to_string()),
    }
}

pub fn run(args: &[String]) -> Result<(), String> {
    if !args.is_empty() {
        return Err("usage: tacitweave-ops genie-status".into());
    }
    let env: BTreeMap<String, String> = std::env::vars().collect();
    println!(
        "{}",
        serde_json::to_string_pretty(&status_from(&env)).map_err(|error| error.to_string())?
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stays_unconfigured_without_all_fields() {
        let mut env = BTreeMap::new();
        env.insert("GENIE_API_KEY".into(), "placeholder".into());
        let status = status_from(&env);
        assert!(!status.configured);
        assert!(status.reason.contains("must all be configured"));
    }

    #[test]
    fn rejects_a_non_http_base_url() {
        let env = BTreeMap::from([
            ("GENIE_API_KEY".into(), "placeholder".into()),
            ("GENIE_BASE_URL".into(), "not-a-url".into()),
            ("GENIE_MODEL_ID".into(), "genie-4".into()),
        ]);
        assert!(!status_from(&env).configured);
    }

    #[test]
    fn reports_configured_without_exposing_the_key() {
        let env = BTreeMap::from([
            ("GENIE_API_KEY".into(), "secret".into()),
            ("GENIE_BASE_URL".into(), "https://example.invalid".into()),
            ("GENIE_MODEL_ID".into(), "genie-4".into()),
        ]);
        let status = status_from(&env);
        assert!(status.configured);
        assert!(!serde_json::to_string(&status).unwrap().contains("secret"));
    }
}
