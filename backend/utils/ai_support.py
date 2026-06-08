from __future__ import annotations

import re
import unicodedata


AI_SUPPORTED_CLASS_NAMES = [
    "chicken",
    "fish",
    "pork",
    "apple",
    "banana",
    "bellpepper",
    "carrot",
    "cucumber",
    "mango",
    "orange",
    "potato",
    "lettuce",
]

AI_SUPPORTED_DISPLAY_NAMES = {
    "chicken": "Ga",
    "fish": "Ca",
    "pork": "Thit heo",
    "apple": "Tao",
    "banana": "Chuoi",
    "bellpepper": "Ot chuong",
    "carrot": "Ca rot",
    "cucumber": "Dua leo",
    "mango": "Xoai",
    "orange": "Cam",
    "potato": "Khoai tay",
    "lettuce": "Xa lach",
}

AI_CLASS_KEYWORDS = {
    "chicken": ["ga", "uc ga", "thit ga"],
    "fish": ["ca hoi", "ca tuyet", "ca basa", "ca dieu hong", "ca thu", "ca "],
    "pork": ["thit heo", "heo", "suon non", "ba chi heo", "heo iberico"],
    "apple": ["tao"],
    "banana": ["chuoi"],
    "bellpepper": ["ot chuong"],
    "carrot": ["ca rot"],
    "cucumber": ["dua leo", "dua chuot"],
    "mango": ["xoai"],
    "orange": ["cam"],
    "potato": ["khoai tay"],
    "lettuce": ["xa lach", "romaine", "lettuce"],
}


def normalize_food_text(value: str | None) -> str:
    raw = (value or "").strip().lower()
    normalized = unicodedata.normalize("NFKD", raw)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_value)


def infer_ai_class_name(product_name: str | None) -> str | None:
    normalized_name = normalize_food_text(product_name)
    if not normalized_name:
        return None

    padded_name = f" {normalized_name} "
    for class_name, keywords in AI_CLASS_KEYWORDS.items():
        for keyword in keywords:
            normalized_keyword = normalize_food_text(keyword)
            if not normalized_keyword:
                continue
            if f" {normalized_keyword} " in padded_name or normalized_keyword in normalized_name:
                return class_name
    return None
