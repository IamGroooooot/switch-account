# switch-account reference

## `claude-account` commands

| Command | What it does |
| --- | --- |
| `list` | Prints each account and its email. `*` marks the account that new terminal sessions start as. |
| `status [name]` | Prints the login state and the date the login ends, for one account or for all accounts. |
| `add <name>` | Creates the account folder and links the shared entries of `~/.claude` into it. |
| `login <name>` | Runs `claude auth login` as the account. Opens a browser. |
| `use <name>` | Writes `<name>` to `$CLAUDE_ACCOUNTS_ROOT/active`. New terminal sessions start as it. |
| `current` | Prints the account and email of the calling process. |
| `run <name> [args]` | Runs `claude [args]` once as the account. |
| `desktop <name>` | macOS only. Opens the Claude Desktop app with the account's data folder. |
| `link <name>` | Links entries that were added to `~/.claude` after `add`, and removes links whose source is gone. `use`, `login`, and `run` also do this. |
| `dir [name]` | Prints the account's `CLAUDE_CONFIG_DIR`. Prints nothing for the base account. Without a name, uses the active account. |
| `json` | Prints every account as one JSON array. The mod reads this output. |

Account names use lowercase letters, digits, `-`, and `_`, and start with a
letter or a digit.

`current` decides the account in this order:

1. `CLAUDE_CONFIG_DIR`, matched against the account folders.
2. `CLAUDE_CODE_USER_EMAIL`, matched against each account's email. The Desktop
   app's Code tab sets this variable.
3. The base account.

### `json` output

```json
[{"name":"personal","email":"you@example.com","isSignedIn":true,"until":"2026-12-01","isBase":true,"isDefault":false,"isSession":true}]
```

| Field | Meaning |
| --- | --- |
| `name` | The account name. |
| `email` | The email from `claude auth status`. Empty if the account is not signed in. |
| `isSignedIn` | `loggedIn` from `claude auth status`. |
| `until` | The date part of `loginExpiresAt`. Empty if unknown. |
| `isBase` | The account is `~/.claude` itself. |
| `isDefault` | New terminal sessions start as this account. |
| `isSession` | The calling process runs as this account. |

## `/account` mod

| Command | What it does |
| --- | --- |
| `/account` | Opens the accounts pane. If the pane can't be placed, prints the account list. The output starts with the account line. |
| `/account list` | Prints the account list. |
| `/account use <name>` | Same as `claude-account use <name>`. |
| `/account desktop <name>` | Same as `claude-account desktop <name>`. |
| `/account add <name>` | Same as `claude-account add <name>`. |
| `/account login <name>` | Same as `claude-account login <name>`. Waits up to 5 minutes for the browser sign-in. |

The pane has one block per account:

- The first line is the name and its tags. `this session` is the account of
  the current session. `next` is the account that new terminal sessions start as.
- The second line is the email and the days left on the login.
- A warning line appears if the login has less than 3 days left or the account
  is signed out.
- The third line has the buttons. **Re-login** appears only with the warning.
  **Use next** appears on every account except the `next` one. **Desktop** is
  on every account.

The account line reads `<session account> → <next account>`. The arrow part
appears only when the two accounts differ. The base account's email is left
out, and every other account shows its email. The Desktop app shows the
account line as the mod's status line. The terminal shows it only in the
output of `/account`.

## Settings

| Variable | Default | Read by |
| --- | --- | --- |
| `CLAUDE_ACCOUNTS_ROOT` | `~/.claude-accounts` | script, shell hooks |
| `CLAUDE_ACCOUNT_BASE_NAME` | `personal` | script |
| `CLAUDE_ACCOUNT_CLAUDE_BIN` | `claude` | script |
| `CLAUDE_ACCOUNT_BIN` | `~/.local/bin/claude-account` | mod |

## Files

| Path | Contents |
| --- | --- |
| `~/.claude` | The base account's config folder. |
| `~/.claude.json` | The base account's account info, folder trust, and user MCP servers. |
| `$CLAUDE_ACCOUNTS_ROOT/<name>/config` | The account's `CLAUDE_CONFIG_DIR`. |
| `$CLAUDE_ACCOUNTS_ROOT/<name>/config/.claude.json` | The account's account info and folder trust. `add` copies the user MCP servers into it. |
| `$CLAUDE_ACCOUNTS_ROOT/<name>/desktop-data` | The Desktop app's data folder for the account. |
| `$CLAUDE_ACCOUNTS_ROOT/active` | The name of the account that new terminal sessions start as. |

Every entry of `~/.claude` is a symlink inside each account's `config`
folder, except these entries, which each account keeps for itself:

- `.credentials.json`
- `mcp-needs-auth-cache.json`
- `daemon`
- `backups`

## Shell hooks

| File | Shell | Mechanism |
| --- | --- | --- |
| `shell/claude-account.fish` | fish | Sets `CLAUDE_CONFIG_DIR` before each command (`fish_preexec`). |
| `shell/claude-account.sh` | zsh, bash | Wraps the `claude` command in a function. |

Both hooks leave `CLAUDE_CONFIG_DIR` alone if you set it to a folder outside
`$CLAUDE_ACCOUNTS_ROOT`. Aliases of `claude` keep working with both hooks.

## `install.sh` options

| Option | Effect |
| --- | --- |
| none | Links `bin/claude-account` into `~/.local/bin`. |
| `--shell fish`, `--shell zsh`, `--shell bash` | Also installs that shell's hook. zsh and bash get one line, marked `# switch-account`, at the end of `~/.zshrc` or `~/.bashrc`. |
| `--shell auto` | Picks the shell from `$SHELL`. |
| `--mod` | Also runs `claude plugin marketplace add <repo>` and `claude plugin install account@switch-account`. |
| `--all` | Same as `--shell auto --mod`. |
| `--bin-dir <dir>` | Links the script into `<dir>`. |
| `--uninstall` | Removes the script link, the hooks, and the mod. Keeps `$CLAUDE_ACCOUNTS_ROOT`. |
