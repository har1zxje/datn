"""Backward-compatible seed entrypoint.

The previous version of this file had invalid indentation and stale model fields.
Use seed_new.py as the maintained implementation.
"""
from seed_new import seed_data


if __name__ == "__main__":
    seed_data()
