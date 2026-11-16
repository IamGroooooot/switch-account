import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Row } from '../types'

// The mod is a face on the claude-account script: every switch happens there,
// so the script works the same with or without the mod.
const DEFAULT_BIN = '.local/bin/claude-account' // under $HOME
const PANE = 'accounts'
// A login this close to its end gets a Re-login button and a warning line.
const SOON_DAYS = 3

const rows = atom({ plugin: 'account', key: 'rows' } as const, [] as Row[])
const note = atom({ plugin: 'account', key: 'note' } as const, '')

const HELP = [
  '/account                open the accounts pane',
  '/account list           list accounts as text',
  '/account use <name>     account for the next terminal sessions',
  '/account desktop <name> open the Desktop app as <name>',
  '/account add <name>     register a new account',
  '/account login <name>   sign in to <name> again',
].join('\n')

export const register: Register = on => {
  // Where this session draws. The terminal draws a plugin's status line as a
  // pinned warning, and a band above the prompt reads as a stray line, so the
  // terminal shows the account only when asked (/account); other surfaces
  // keep it in the status line.
  let isTerminal = false

  on('session.start', async ($, e, next) => {
    isTerminal = e.surface === 'terminal'
    await $.command.register({
      name: 'account',
      description: 'Show and switch Claude Code accounts',
      argumentHint: '[list|use|desktop|add|login] <name>',
    })
    await refresh($, isTerminal)

    return next(e)
  })

  on('command.run', { command: 'account' }, async ($, e) => {
    const [verb = '', name = ''] = e.args.trim().split(/\s+/).filter(Boolean)

    switch (verb) {
      case '': {
        await refresh($, isTerminal)
        const opened = await $.ui.open({ id: PANE, title: 'Accounts' })
        const list = await read($, rows)
        const summary = statusText(list)

        if (!opened.isPlaced) return { text: listText(list) }

        return { text: summary ? `${summary}  (accounts pane opened)` : 'Accounts pane opened.' }
      }

      case 'list':
      case 'status':
        await refresh($, isTerminal)

        return { text: listText(await read($, rows)) }

      case 'use':
      case 'desktop':
      case 'add':
      case 'login': {
        if (!name) return { text: HELP }

        return { text: await act($, verb, name, isTerminal) }
      }

      default:
        return { text: HELP }
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, rows)
    const message = await read($, note)
    const press = (verb: string, name: string) => () => void act($, verb, name, isTerminal)

    // One block per account, every block the same three lines: who, login
    // state, actions. Buttons start at the same left edge in every block, so
    // the eye compares names and states, not layouts. One term, "next", names
    // the account new terminal sessions start as, in the tag and the button.
    return (
      <Box flexDirection="column" rowGap={2}>
        {list.length === 0 && <Text dimColor>Loading accounts…</Text>}
        {list.map(row => (
          <Box key={`row-${row.name}`} flexDirection="column" rowGap={1}>
            <Box flexDirection="column">
              <Box flexDirection="row" columnGap={1}>
                <Text weight="semibold">{row.name}</Text>
                {row.isSession && <Text color="success">this session</Text>}
                {row.isDefault && <Text dimColor>next</Text>}
              </Box>
              <Text dimColor>
                {row.email || 'not signed in'}
                {row.isSignedIn && row.until && !needsLogin(row) ? ` · ${daysLeft(row)}d left` : ''}
              </Text>
              {needsLogin(row) && (
                <Text color="warning">{warning(row)}</Text>
              )}
            </Box>
            <Box flexDirection="row" flexWrap="wrap" columnGap={1} rowGap={1}>
              {needsLogin(row) && (
                <Button
                  key={`login-${row.name}`}
                  label="Re-login"
                  variant="primary"
                  onPress={press('login', row.name)}
                />
              )}
              {!row.isDefault && (
                <Button key={`use-${row.name}`} label="Use next" onPress={press('use', row.name)} />
              )}
              <Button
                key={`desktop-${row.name}`}
                label="Desktop"
                variant="secondary"
                onPress={press('desktop', row.name)}
              />
            </Box>
          </Box>
        ))}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={2}>
          <Text dimColor size="footnote">
            {message || 'Open sessions keep their account.'}
          </Text>
          <Button key="refresh" label="Refresh" plain dimColor onPress={() => void refresh($, isTerminal)} />
        </Box>
      </Box>
    )
  })
}

function daysLeft(row: Row) {
  return Math.max(0, Math.floor((Date.parse(row.until) - Date.now()) / 86_400_000))
}

// A /login inside a session signs in that session's account, so one account
// can end up holding another's login. The row then says so and offers
// Re-login, because the email alone looks right.
function needsLogin(row: Row) {
  if (!row.isSignedIn || !row.until || row.sameLoginAs) return true

  return daysLeft(row) < SOON_DAYS
}

function warning(row: Row) {
  if (!row.isSignedIn) return 'signed out'
  if (row.sameLoginAs) return `same login as ${row.sameLoginAs}`

  return `login ends in ${daysLeft(row)}d (${row.until})`
}

// This session's account, then "→ next" only when new terminal sessions start
// as another one. The base account (~/.claude) is the everyday one, so its
// email is left out; any other account shows its email so a session on it is
// never mistaken for the everyday one. The surface already prefixes the mod's
// name, so the line has no label of its own.
function statusText(list: Row[]) {
  const session = list.find(row => row.isSession)
  if (!session) return undefined
  const following = list.find(row => row.isDefault)
  const who = session.isBase || !session.email ? session.name : `${session.name} · ${session.email}`
  const next = following && following.name !== session.name ? ` → ${following.name}` : ''

  return `${who}${next}`
}

function listText(list: Row[]) {
  if (list.length === 0) return 'No accounts found. Is claude-account installed?'
  const lines = list.map(row => {
    const state = row.isSignedIn ? `signed in until ${row.until || '?'}` : 'not signed in'
    const same = row.sameLoginAs ? `  same login as ${row.sameLoginAs}` : ''
    const tags = [row.isSession && 'this session', row.isDefault && 'next'].filter(Boolean).join(', ')

    return `${row.name.padEnd(12)} ${(row.email || '-').padEnd(28)} ${state}${tags ? `  (${tags})` : ''}${same}`
  })

  return lines.join('\n')
}

async function act($: EngineInterface, verb: string, name: string, isTerminal: boolean) {
  if (verb === 'login') await update($, note, () => `Signing in to ${name}: finish in the browser…`)
  // A browser sign-in may take minutes; the rest is quick.
  const out = await script($, [verb, name], verb === 'login' ? 300_000 : 20_000)
  const text = (out.stdout || out.stderr).trim().split('\n').at(-1) ?? ''
  await update($, note, () => text)
  if (out.exitCode === 0 && verb === 'use') $.ui.toast(`Next sessions start as ${name}`)
  if (verb !== 'desktop') await refresh($, isTerminal)

  return (out.stdout || out.stderr).trimEnd()
}

async function refresh($: EngineInterface, isTerminal: boolean) {
  const out = await script($, ['json'])
  try {
    const list = JSON.parse(out.stdout) as Row[]
    await update($, rows, () => list)
    // The terminal keeps nothing on screen; clear a line an older version left.
    $.ui.status(isTerminal ? undefined : statusText(list))
  } catch {
    await update($, note, () => out.stderr.trim() || 'could not read accounts')
  }
}

// The script is found at $CLAUDE_ACCOUNT_BIN, else ~/.local/bin/claude-account.
async function script($: EngineInterface, args: string[], timeoutMs = 20_000) {
  const home = (await $.env.get('HOME')) ?? ''
  const bin = (await $.env.get('CLAUDE_ACCOUNT_BIN')) || `${home}/${DEFAULT_BIN}`
  try {
    return await $.process.run([bin, ...args], { cwd: home, timeoutMs })
  } catch (err) {
    return { exitCode: 1, stdout: '', stderr: `claude-account failed: ${String(err)}` }
  }
}
