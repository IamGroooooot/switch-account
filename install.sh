#!/usr/bin/env bash
# Install switch-account: the claude-account script, a shell hook, and the
# /account mod. Run ./install.sh --help for the options.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bin_dir="$HOME/.local/bin"
shell_name=""
do_mod=false
do_uninstall=false

usage() {
  cat <<'EOF'
usage: ./install.sh [options]

  (no options)      link claude-account into ~/.local/bin
  --shell <name>    also install the shell hook: fish, zsh, or bash
  --shell auto      pick the hook from $SHELL
  --mod             also install the /account mod into Claude Code
  --all             same as --shell auto --mod
  --bin-dir <dir>   link the script into <dir> instead of ~/.local/bin
  --uninstall       undo all of the above (accounts in ~/.claude-accounts stay)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --shell) shell_name="${2:-}"; shift 2 ;;
    --mod) do_mod=true; shift ;;
    --all) shell_name=auto; do_mod=true; shift ;;
    --bin-dir) bin_dir="${2:-}"; shift 2 ;;
    --uninstall) do_uninstall=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done

if [[ "$shell_name" == auto ]]; then
  shell_name="$(basename "${SHELL:-}")"
fi

rc_file() {
  case "$1" in
    zsh) echo "${ZDOTDIR:-$HOME}/.zshrc" ;;
    bash) echo "$HOME/.bashrc" ;;
  esac
}

source_line="source \"$here/shell/claude-account.sh\"  # switch-account"
fish_hook="$HOME/.config/fish/conf.d/claude-account.fish"

install_shell() {
  case "$1" in
    fish)
      mkdir -p "$(dirname "$fish_hook")"
      ln -sf "$here/shell/claude-account.fish" "$fish_hook"
      echo "linked $fish_hook"
      ;;
    zsh|bash)
      local rc; rc="$(rc_file "$1")"
      if [[ -f "$rc" ]] && grep -qF "# switch-account" "$rc"; then
        echo "kept $rc (hook already there)"
      else
        printf '\n%s\n' "$source_line" >> "$rc"
        echo "added the hook to $rc"
      fi
      ;;
    "") ;;
    *) echo "install.sh: no hook for shell '$1' (use fish, zsh, or bash)" >&2; exit 2 ;;
  esac
}

install_mod() {
  command -v claude >/dev/null 2>&1 || { echo "install.sh: claude is not on PATH" >&2; exit 1; }
  command claude plugin marketplace add "$here"
  command claude plugin install account@switch-account --scope user
}

uninstall() {
  rm -f "$bin_dir/claude-account" "$fish_hook"
  local sh rc
  for sh in zsh bash; do
    rc="$(rc_file "$sh")"
    if [[ -f "$rc" ]] && grep -qF "# switch-account" "$rc"; then
      grep -vF "# switch-account" "$rc" > "$rc.switch-account.tmp" && mv "$rc.switch-account.tmp" "$rc"
      echo "removed the hook from $rc"
    fi
  done
  if command -v claude >/dev/null 2>&1; then
    command claude plugin uninstall account@switch-account 2>/dev/null || true
    command claude plugin marketplace remove switch-account 2>/dev/null || true
  fi
  echo "uninstalled. Accounts in ${CLAUDE_ACCOUNTS_ROOT:-$HOME/.claude-accounts} are kept."
}

if $do_uninstall; then
  uninstall
  exit 0
fi

mkdir -p "$bin_dir"
ln -sf "$here/bin/claude-account" "$bin_dir/claude-account"
echo "linked $bin_dir/claude-account"
case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *) echo "note: $bin_dir is not on your PATH. Add it, or pass --bin-dir." ;;
esac

install_shell "$shell_name"
if $do_mod; then install_mod; fi

echo
echo "Next: claude-account add work && claude-account login work"
[[ -n "$shell_name" ]] && echo "Open a new terminal window so the shell hook loads."
exit 0
