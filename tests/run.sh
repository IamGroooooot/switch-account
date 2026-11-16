#!/usr/bin/env bash
# Run every test: the script smoke tests, then the mod's tests.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash "$repo/tests/script.sh"
command claude plugin validate "$repo/mod/account" >/dev/null
command claude plugin test "$repo/mod/account"
