#!/usr/bin/env bash
# Runs all tests from the repo root. Needs: python3, playwright + chromium (see test_pages.py).
set -e
cd "$(dirname "$0")/.."
python3 tests/test_server.py
python3 tests/test_capabilities.py
python3 tests/test_pages.py
