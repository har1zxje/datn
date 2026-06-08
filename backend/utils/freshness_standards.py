from __future__ import annotations

from typing import Any

# Verified reference:
# - EU Regulation (EC) No 2074/2005, Section II, Chapter I (TVB-N limits by fish category)
#   https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32005R2074
#
# Important:
# - Category-based TVB-N limits are species-specific (25/30/35 mg N per 100 g).
# - pH, Brix, firmness, generic log CFU/g thresholds are product/process specific and
#   should be configured by your QA/Regulatory team from applicable standards and SOPs.

VERIFIED_PROFILE_CONFIGS: dict[str, dict[str, Any]] = {
    "fish": {
        "assessment_basis": "eu_2074_2005_tvb_n_v1",
        "sources": [
            {
                "title": "Commission Regulation (EC) No 2074/2005 (consolidated)",
                "url": "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32005R2074",
                "section": "Section II, Chapter I (TVB-N limit values) and Chapter II (species categories)",
                "limits": {
                    "category_1": 25.0,
                    "category_2": 30.0,
                    "category_3": 35.0,
                },
            }
        ],
        "weights": {
            "tvb_n_mg_100g": 1.0,
        },
    },
}

# Provisional/demo thresholds for engineering sandbox only.
# Do not use for regulatory claims.
PROVISIONAL_PROFILE_CONFIGS: dict[str, dict[str, Any]] = {
    "produce": {
        "weights": {
            "brix": 0.25,
            "firmness_n": 0.25,
            "color_index": 0.2,
            "microbial_log_cfu_g": 0.2,
            "storage_temp_c": 0.1,
        },
        "targets": {
            "brix": (8.0, 14.0),
            "firmness_n": (20.0, 80.0),
            "color_index": (65.0, 100.0),
            "microbial_log_cfu_g_max": 5.5,
            "storage_temp_c_max": 8.0,
        },
    },
    "meat": {
        "weights": {
            "ph": 0.2,
            "drip_loss_pct": 0.2,
            "tvb_n_mg_100g": 0.25,
            "microbial_log_cfu_g": 0.25,
            "storage_temp_c": 0.1,
        },
        "targets": {
            "ph": (5.4, 6.0),
            "drip_loss_pct_max": 3.0,
            "tvb_n_mg_100g_max": 20.0,
            "microbial_log_cfu_g_max": 6.0,
            "storage_temp_c_max": 4.0,
        },
    },
}

SOURCE_TYPE_BASE_SCORE: dict[str, float] = {
    "iso17025_lab_report": 95.0,
    "government_portal": 92.0,
    "accredited_third_party": 88.0,
    "manufacturer_coa": 72.0,
    "retailer_coa": 62.0,
    "manual_operator_input": 35.0,
    "unknown": 25.0,
}


def _clamp_0_100(value: float) -> float:
    return max(0.0, min(100.0, value))


def _score_upper_bound(value: float, max_value: float, soft_margin: float = 0.4) -> float:
    if value <= max_value:
        return 100.0
    hard_limit = max_value * (1.0 + soft_margin)
    if value >= hard_limit:
        return 0.0
    ratio = (value - max_value) / max(hard_limit - max_value, 1e-6)
    return _clamp_0_100(100.0 - ratio * 100.0)


def _score_target_range(value: float, lower: float, upper: float) -> float:
    if lower <= value <= upper:
        return 100.0
    if value < lower:
        width = max(lower, 1.0)
        return _clamp_0_100(100.0 - ((lower - value) / width) * 100.0)
    width = max(upper, 1.0)
    return _clamp_0_100(100.0 - ((value - upper) / width) * 100.0)


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        token = value.strip().lower()
        if token in {"1", "true", "yes", "y", "on"}:
            return True
        if token in {"0", "false", "no", "n", "off"}:
            return False
    return None


def _to_level(score: float) -> str:
    if score >= 80:
        return "fresh"
    if score >= 65:
        return "good"
    if score >= 45:
        return "moderate"
    return "expiring"


def _score_source_reliability(indicators: dict[str, Any]) -> dict[str, Any]:
    """
    Source reliability scoring (0-100), used to adjust final freshness score.

    R_source = 0.30*R_type + 0.25*R_accreditation + 0.20*R_integrity + 0.15*R_recency + 0.10*R_traceability
    """
    source = indicators.get("source_evidence")
    if not isinstance(source, dict):
        source = {}

    source_type = str(source.get("source_type") or "unknown").strip().lower()
    r_type = SOURCE_TYPE_BASE_SCORE.get(source_type, SOURCE_TYPE_BASE_SCORE["unknown"])

    # Accreditation signal (ISO/IEC 17025 and equivalent accredited scope).
    accredited = _to_bool(source.get("accredited_lab"))
    accreditation_scope_ok = _to_bool(source.get("accreditation_scope_match"))
    if accredited is True and accreditation_scope_ok is True:
        r_accreditation = 100.0
    elif accredited is True:
        r_accreditation = 85.0
    elif accredited is False:
        r_accreditation = 35.0
    else:
        r_accreditation = 50.0

    # Integrity signal: digital signature, document hash, completeness.
    signature_ok = _to_bool(source.get("digital_signature_verified"))
    hash_ok = _to_bool(source.get("document_hash_verified"))
    completeness = _to_float(source.get("completeness_ratio"))
    completeness = 0.6 if completeness is None else max(0.0, min(1.0, completeness))
    signature_score = 100.0 if signature_ok is True else 30.0 if signature_ok is False else 55.0
    hash_score = 100.0 if hash_ok is True else 30.0 if hash_ok is False else 55.0
    completeness_score = completeness * 100.0
    r_integrity = round((signature_score + hash_score + completeness_score) / 3.0, 2)

    # Recency signal: newer reports are more reliable for freshness decisions.
    age_days = _to_float(source.get("sample_age_days"))
    if age_days is None:
        r_recency = 60.0
    elif age_days <= 1:
        r_recency = 100.0
    elif age_days <= 3:
        r_recency = 90.0
    elif age_days <= 7:
        r_recency = 75.0
    elif age_days <= 14:
        r_recency = 55.0
    else:
        r_recency = 35.0

    # Traceability signal: can we map sample -> lot -> supplier -> test record?
    traceable = _to_bool(source.get("traceable_lot_chain"))
    r_traceability = 100.0 if traceable is True else 35.0 if traceable is False else 60.0

    r_source = round(
        0.30 * r_type
        + 0.25 * r_accreditation
        + 0.20 * r_integrity
        + 0.15 * r_recency
        + 0.10 * r_traceability,
        2,
    )

    return {
        "source_reliability_score": r_source,
        "source_reliability_breakdown": {
            "source_type_score": round(r_type, 2),
            "accreditation_score": round(r_accreditation, 2),
            "integrity_score": round(r_integrity, 2),
            "recency_score": round(r_recency, 2),
            "traceability_score": round(r_traceability, 2),
        },
        "source_reliability_formula": "R_source = 0.30*R_type + 0.25*R_accreditation + 0.20*R_integrity + 0.15*R_recency + 0.10*R_traceability",
    }


def _apply_source_reliability(s_indicator: float, source_reliability_score: float) -> float:
    """
    Penalize indicator score when source is weak, avoid unrealistic score inflation.

    S_final = S_indicator * (0.70 + 0.30 * R_source/100)
    """
    adjusted = s_indicator * (0.70 + 0.30 * (source_reliability_score / 100.0))
    return round(_clamp_0_100(adjusted), 2)


def _evaluate_verified_fish(indicators: dict[str, Any], config: dict[str, Any]) -> dict[str, Any] | None:
    tvb_n = _to_float(indicators.get("tvb_n_mg_100g"))
    category = _to_int(indicators.get("tvb_n_category"))
    if tvb_n is None or category not in {1, 2, 3}:
        return None

    limits = config["sources"][0]["limits"]
    category_key = f"category_{category}"
    tvb_limit = float(limits[category_key])
    tvb_score = round(_score_upper_bound(tvb_n, tvb_limit, soft_margin=0.5), 2)

    source_part = _score_source_reliability(indicators)
    r_source = source_part["source_reliability_score"]
    freshness_score = _apply_source_reliability(tvb_score, r_source)
    return {
        "assessment_basis": config["assessment_basis"],
        "commodity_group": "fish",
        "freshness_score": freshness_score,
        "freshness_level": _to_level(freshness_score),
        "ai_confidence": round(min(99.0, 45.0 + 0.35 * tvb_score + 0.35 * r_source), 2),
        "raw_indicator_score": tvb_score,
        "detected_issues": ["tvb_n_outside_target"] if tvb_score < 60 else [],
        "component_scores": {"tvb_n_mg_100g": tvb_score},
        "measured_indicators": {
            "tvb_n_mg_100g": tvb_n,
            "tvb_n_category": category,
        },
        "standards_profile": {
            "tvb_n_limit_mg_100g": tvb_limit,
        },
        "sources": config["sources"],
        "is_provisional": False,
        **source_part,
        "final_score_formula": "S_final = S_indicator * (0.70 + 0.30 * R_source/100)",
    }


def _score_provisional_indicator(metric: str, value: float, targets: dict[str, Any]) -> float | None:
    if metric in {"brix", "firmness_n", "ph", "color_index"}:
        bounds = targets.get(metric)
        if not bounds:
            return None
        return _score_target_range(value, bounds[0], bounds[1])
    if metric == "drip_loss_pct":
        max_val = targets.get("drip_loss_pct_max")
        return _score_upper_bound(value, max_val) if max_val is not None else None
    if metric == "tvb_n_mg_100g":
        max_val = targets.get("tvb_n_mg_100g_max")
        return _score_upper_bound(value, max_val) if max_val is not None else None
    if metric == "microbial_log_cfu_g":
        max_val = targets.get("microbial_log_cfu_g_max")
        return _score_upper_bound(value, max_val, soft_margin=0.25) if max_val is not None else None
    if metric == "storage_temp_c":
        max_val = targets.get("storage_temp_c_max")
        return _score_upper_bound(value, max_val, soft_margin=1.0) if max_val is not None else None
    return None


def _evaluate_provisional(indicators: dict[str, Any], profile: str, config: dict[str, Any]) -> dict[str, Any] | None:
    weights: dict[str, float] = config["weights"]
    targets: dict[str, Any] = config["targets"]

    measured: dict[str, float] = {}
    per_metric_scores: dict[str, float] = {}
    weighted_total = 0.0
    observed_weight = 0.0
    issues: list[str] = []

    for metric, weight in weights.items():
        raw = _to_float(indicators.get(metric))
        if raw is None:
            continue
        measured[metric] = raw
        metric_score = _score_provisional_indicator(metric, raw, targets)
        if metric_score is None:
            continue
        metric_score = round(metric_score, 2)
        per_metric_scores[metric] = metric_score
        weighted_total += metric_score * weight
        observed_weight += weight
        if metric_score < 60:
            issues.append(f"{metric}_outside_target")

    if observed_weight == 0:
        return None

    s_indicator = round(weighted_total / observed_weight, 2)
    source_part = _score_source_reliability(indicators)
    r_source = source_part["source_reliability_score"]
    freshness_score = _apply_source_reliability(s_indicator, r_source)
    return {
        "assessment_basis": "provisional_internal_thresholds_v1",
        "commodity_group": profile,
        "freshness_score": freshness_score,
        "freshness_level": _to_level(freshness_score),
        "ai_confidence": round(min(95.0, 40.0 + 0.35 * s_indicator + 0.35 * r_source), 2),
        "raw_indicator_score": s_indicator,
        "detected_issues": sorted(set(issues)),
        "component_scores": per_metric_scores,
        "measured_indicators": measured,
        "standards_profile": targets,
        "sources": [],
        "is_provisional": True,
        **source_part,
        "final_score_formula": "S_final = S_indicator * (0.70 + 0.30 * R_source/100)",
    }


def evaluate_freshness_with_standards(
    indicators: dict[str, Any] | None,
    *,
    default_profile: str = "produce",
    allow_provisional: bool = False,
) -> dict[str, Any] | None:
    if not indicators:
        return None

    profile = str(indicators.get("commodity_group") or default_profile).lower().strip()

    # 1) Verified standards path.
    verified_config = VERIFIED_PROFILE_CONFIGS.get(profile)
    if verified_config and profile == "fish":
        evaluated = _evaluate_verified_fish(indicators, verified_config)
        if evaluated:
            return evaluated

    # 2) Optional provisional path.
    if allow_provisional:
        provisional_config = PROVISIONAL_PROFILE_CONFIGS.get(profile)
        if provisional_config:
            return _evaluate_provisional(indicators, profile, provisional_config)

    return None
