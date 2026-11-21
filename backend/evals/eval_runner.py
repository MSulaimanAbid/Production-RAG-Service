"""
Evaluation runner - single entry point for all evaluation experiments.

Usage:
    python -m backend.evals.eval_runner --config a
    python -m backend.evals.eval_runner --config b --save-results
"""
from __future__ import annotations

import argparse


def main() -> None:
    """Run evaluation for the specified configuration."""
    parser = argparse.ArgumentParser(description="RAG Evaluation Runner")
    parser.add_argument("--config", choices=["a", "b"], required=True, help="Configuration to evaluate (a or b)")
    parser.add_argument("--save-results", action="store_true", help="Save results to evals/results/")
    args = parser.parse_args()

    print(f"Running evaluation for Config {args.config.upper()}...")
    # Implemented in Phase 11


if __name__ == "__main__":
    main()
