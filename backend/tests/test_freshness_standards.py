"""
[M6] Unit tests — utils/freshness_standards.py
Covers: scoring helpers, fish TVB-N evaluation, provisional produce/meat profiles,
        source reliability weighting, and config constants.
"""
import pytest

from utils.freshness_standards import (
    _clamp_0_100,
    _score_upper_bound,
    _score_target_range,
    _to_level,
    _score_source_reliability,
    evaluate_freshness_with_standards,
)
from config import SPOILED_AI_LABELS, BAD_MANUAL_RATINGS, TAX_RATE, FREE_SHIPPING_THRESHOLD


class TestClamp:
    def test_clamp_below_zero(self):
        assert _clamp_0_100(-10) == 0.0

    def test_clamp_above_100(self):
        assert _clamp_0_100(110) == 100.0

    def test_clamp_within_range(self):
        assert _clamp_0_100(55.5) == 55.5


class TestScoreUpperBound:
    def test_below_max_scores_100(self):
        assert _score_upper_bound(10.0, 25.0) == 100.0

    def test_at_max_scores_100(self):
        assert _score_upper_bound(25.0, 25.0) == 100.0

    def test_above_hard_limit_scores_0(self):
        # hard_limit = 25 * 1.4 = 35
        assert _score_upper_bound(35.0, 25.0) == 0.0

    def test_midpoint_scores_partial(self):
        score = _score_upper_bound(30.0, 25.0)
        assert 0.0 < score < 100.0


class TestScoreTargetRange:
    def test_within_range_scores_100(self):
        assert _score_target_range(10.0, 8.0, 14.0) == 100.0

    def test_at_lower_bound_scores_100(self):
        assert _score_target_range(8.0, 8.0, 14.0) == 100.0

    def test_below_lower_penalized(self):
        score = _score_target_range(5.0, 8.0, 14.0)
        assert 0.0 < score < 100.0

    def test_above_upper_penalized(self):
        score = _score_target_range(20.0, 8.0, 14.0)
        assert 0.0 < score < 100.0


class TestToLevel:
    def test_fresh_above_80(self):
        assert _to_level(85) == "fresh"

    def test_good_65_to_80(self):
        assert _to_level(70) == "good"

    def test_moderate_45_to_65(self):
        assert _to_level(55) == "moderate"

    def test_expiring_below_45(self):
        assert _to_level(30) == "expiring"


class TestSourceReliability:
    def test_unknown_source_lower_score(self):
        result = _score_source_reliability({"source_evidence": {"source_type": "unknown"}})
        assert result["source_reliability_score"] < 70

    def test_iso_accredited_source_high_score(self):
        result = _score_source_reliability({
            "source_evidence": {
                "source_type": "iso17025_lab_report",
                "accredited_lab": True,
                "accreditation_scope_match": True,
                "digital_signature_verified": True,
                "document_hash_verified": True,
                "completeness_ratio": 1.0,
                "sample_age_days": 1,
                "traceable_lot_chain": True,
            }
        })
        assert result["source_reliability_score"] > 90

    def test_missing_source_evidence_returns_partial_score(self):
        result = _score_source_reliability({})
        assert 0 < result["source_reliability_score"] < 100


class TestEvaluateFreshnessFish:
    def _base_indicators(self, tvb_n=10.0, category=1):
        return {
            "commodity_group": "fish",
            "tvb_n_mg_100g": tvb_n,
            "tvb_n_category": category,
            "source_evidence": {
                "source_type": "iso17025_lab_report",
                "accredited_lab": True,
                "accreditation_scope_match": True,
                "digital_signature_verified": True,
                "document_hash_verified": True,
                "completeness_ratio": 1.0,
                "sample_age_days": 1,
                "traceable_lot_chain": True,
            },
        }

    def test_fresh_fish_scores_high(self):
        result = evaluate_freshness_with_standards(self._base_indicators(tvb_n=10.0, category=1))
        assert result is not None
        assert result["freshness_score"] > 80

    def test_spoiled_fish_scores_low(self):
        # category 1 limit is 25 mg N/100g; 40 is well above the hard limit
        result = evaluate_freshness_with_standards(self._base_indicators(tvb_n=40.0, category=1))
        assert result is not None
        assert result["freshness_score"] < 50

    def test_is_not_provisional(self):
        result = evaluate_freshness_with_standards(self._base_indicators())
        assert result is not None
        assert result["is_provisional"] is False

    def test_missing_tvb_n_returns_none(self):
        indicators = {"commodity_group": "fish", "tvb_n_category": 1}
        result = evaluate_freshness_with_standards(indicators)
        assert result is None

    def test_invalid_category_returns_none(self):
        indicators = {"commodity_group": "fish", "tvb_n_mg_100g": 10.0, "tvb_n_category": 9}
        result = evaluate_freshness_with_standards(indicators)
        assert result is None


class TestEvaluateFreshnessProvisional:
    def test_good_produce_returns_result(self):
        result = evaluate_freshness_with_standards(
            {"commodity_group": "produce", "brix": 10.0, "firmness_n": 50.0},
            allow_provisional=True,
        )
        assert result is not None
        assert result["is_provisional"] is True

    def test_provisional_disabled_returns_none(self):
        result = evaluate_freshness_with_standards(
            {"commodity_group": "produce", "brix": 10.0},
            allow_provisional=False,
        )
        assert result is None

    def test_no_matching_profile_returns_none(self):
        result = evaluate_freshness_with_standards(
            {"commodity_group": "unknown_food", "brix": 10.0},
            allow_provisional=True,
        )
        assert result is None

    def test_empty_indicators_returns_none(self):
        assert evaluate_freshness_with_standards(None) is None
        assert evaluate_freshness_with_standards({}) is None


class TestConfigConstants:
    def test_spoiled_ai_labels_non_empty(self):
        assert len(SPOILED_AI_LABELS) > 0

    def test_spoiled_labels_contain_expected_items(self):
        assert "spoiled_chicken" in SPOILED_AI_LABELS
        assert "rotten_apple" in SPOILED_AI_LABELS

    def test_bad_manual_ratings_contain_expected(self):
        assert "bad" in BAD_MANUAL_RATINGS
        assert "poor" in BAD_MANUAL_RATINGS
        assert "spoiled" in BAD_MANUAL_RATINGS

    def test_tax_rate_is_ten_percent(self):
        from decimal import Decimal
        assert TAX_RATE == Decimal("0.10")

    def test_free_shipping_threshold_is_500k(self):
        from decimal import Decimal
        assert FREE_SHIPPING_THRESHOLD == Decimal("500000")
