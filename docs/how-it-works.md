# How switch-account works

Claude Code keeps one login per config folder. switch-account gives each
account its own config folder and shares everything else between them.

## Why one config folder per account

Claude Code reads its settings and its login from the folder that
`CLAUDE_CONFIG_DIR` names, or from `~/.claude` when the variable is unset. On
macOS the login is a Keychain entry. Its name includes a hash of the folder
path: `Claude Code-credentials` for `~/.claude`, and
`Claude Code-credentials-<first 8 hex digits of sha256(path)>` for any other
folder. On Linux the login is `.credentials.json` inside the folder.

A simpler design would copy one login over another when you switch. That
design loses logins. A session that is still running refreshes its token and
writes it back to the active entry. After a switch, that write puts
the old account's token over the new one. With one folder per account, every
session writes only to its own entry, so a switch can't lose a login.

The cost is that a config folder also holds settings, history, and memory,
and you usually want those shared. So `add` fills the account folder with
symlinks to every entry of `~/.claude`, except the ones that hold login
state. Memory lives in `projects/`, so memory is shared too. `.claude.json`
is not in `~/.claude`, so each account has its own. That file holds the
account info and the folder trust. As a result, a new account asks once per
project whether you trust the folder.

## Why the Desktop app needs a second window

The Code tab of the Claude Desktop app does not use the terminal login. The
app signs in to claude.ai itself and hands the account to each Code session
through environment variables such as `CLAUDE_CODE_USER_EMAIL`. Changing
`CLAUDE_CONFIG_DIR` therefore changes nothing in the Desktop app.

The app is an Electron app. Signed builds ignore `CLAUDE_USER_DATA_DIR`, but
they accept Chromium's `--user-data-dir` switch. A second instance with a
data folder of its own has its own claude.ai sign-in, and it runs next to the
first instance. `claude-account desktop <name>` starts that instance.

Both Desktop windows run their Code sessions on `~/.claude`, because the
account comes from the app and not from the config folder. That sharing is
what keeps memory and skills the same in both windows.

## Why the mod only calls the script

All switching happens in `bin/claude-account`. The mod runs the script
through `$.process.run` and draws what `claude-account json` returns. The mod
API has no call that signs in, signs out, or restarts Claude Code, so the
script has to do that work in any case. Keeping all the logic in the script
also means that the script works the same without the mod, in any shell, and
over SSH.

## Why the terminal shows no account line

A mod's status line in the terminal is drawn as a pinned notice with a
yellow warning sign, and the API has no option to change that style. A band
above the prompt has no warning sign, but it reads as a stray line. So the
terminal shows the account only when you ask for it with `/account`. The
Desktop app draws the status line in dim text, so the Desktop app keeps it.

## Limits

- `use` changes only the sessions that start after it. A running session
  keeps the account it started with, because its login is already loaded.
- A new account starts with no MCP logins, because MCP logins are stored with
  the account's login.
- An organization's managed settings apply only to that organization's
  account.
- A login still ends on its own schedule. `claude-account status` and the
  pane show when.
