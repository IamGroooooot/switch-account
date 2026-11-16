import { expect, test } from 'claude-code/testing'

const ROWS = [
  { name: 'personal', email: 'me@example.com', isSignedIn: true, until: '2000-01-01', isBase: true, isDefault: false, isSession: true, sameLoginAs: '' },
  { name: 'work', email: 'me@work.example', isSignedIn: true, until: '2999-12-31', isBase: false, isDefault: true, isSession: false, sameLoginAs: '' },
]

// Each hook stands for the engine. `process.run` answers as the
// claude-account script would, keyed by its first argument.
const SCRIPT_OUT: Record<string, string> = {
  current: 'personal me@example.com\n',
  list: '  personal     me@example.com\n* work         me@work.example\n',
  status: 'personal     signed in  me@example.com\nwork         signed in  me@work.example\n',
  use: "default is now 'personal' (me@example.com).\n",
  json: JSON.stringify(ROWS),
}

const PANE = {
  plugin: 'account',
  component: 'Pane',
  requestId: 'accounts',
  props: {
    title: 'Accounts',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

function engine(on: any) {
  const seen = { calls: [] as string[][], statuses: [] as (string | undefined)[], toasts: [] as string[] }
  on('env.get', (_: unknown, e: { name: string }) => ({ value: e.name === 'HOME' ? '/Users/me' : undefined }))
  on('command.register', () => ({ value: { command: 'account' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    seen.calls.push([...e.argv])
    const stdout = SCRIPT_OUT[e.argv[1] ?? ''] ?? ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.status', (_: unknown, e: { text?: string }) => {
    seen.statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', (_: unknown, e: { text: string }) => {
    seen.toasts.push(e.text)
    return { value: undefined }
  })
  return seen
}

test('the status line names the session account on start', async ($, on) => {
  const seen = engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(seen.calls[0]).toEqual(['/Users/me/.local/bin/claude-account', 'json'])
  // No "account:" prefix (the surface names the mod); the default shows only when it differs.
  expect(seen.statuses.at(-1)).toBe('personal → work')
})

test('/account opens the pane with a row per account', async ($, on) => {
  engine(on)

  const out = await $.command.run({ command: 'account', args: '' } as any)
  // The command's own output names the account, so the terminal needs no standing line.
  expect(out.text).toBe('personal → work  (accounts pane opened)')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /me@work\.example/ }))?.text).toContain('me@work.example')
    // The expiring personal login offers Re-login; the default row has no Default button.
    expect(await ui.find({ type: 'Button', key: 'login-personal' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'login-work' })).toBeFalsy()
    expect(await ui.find({ type: 'Button', key: 'use-work' })).toBeFalsy()
    await ui.unmount()
  }
})

test('pressing Use next runs the script, toasts and refreshes', async ($, on) => {
  const seen = engine(on)
  await $.command.run({ command: 'account', args: '' } as any)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'use-personal' })

  expect(seen.calls.some(c => c[1] === 'use' && c[2] === 'personal')).toBe(true)
  expect(seen.toasts).toEqual(['Next sessions start as personal'])
  expect(seen.calls.at(-1)?.[1]).toBe('json')
  await ui.unmount()
})

test('/account list still answers as text', async ($, on) => {
  engine(on)

  const out = await $.command.run({ command: 'account', args: 'list' } as any)

  expect(out.text).toContain('work')
  expect(out.text).toContain('signed in until 2999-12-31  (next)')
  expect(out.text).toContain('(this session)')
})

test('the terminal keeps no account line until /account', async ($, on) => {
  const seen = engine(on)

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(seen.statuses.at(-1)).toBeUndefined()

  const band = await $.ui.mount({
    plugin: 'account',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: { hasSurvey: false, isCollapsed: false, isLoading: false },
  } as any)
  expect(await band.find({ type: 'Text', text: /personal/ })).toBeFalsy()
  await band.unmount()

  const out = await $.command.run({ command: 'account', args: '' } as any)
  expect(out.text).toContain('personal → work')
})

test('an account holding another account\'s login says so and offers Re-login', async ($, on) => {
  engine(on)
  const twin = { ...ROWS[0], email: 'me@work.example', until: '2999-12-31', sameLoginAs: 'work' }
  SCRIPT_OUT.json = JSON.stringify([twin, { ...ROWS[1], sameLoginAs: 'personal' }])
  try {
    await $.command.run({ command: 'account', args: '' } as any)
    const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
    expect(await ui.find({ type: 'Text', text: /same login as work/ })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'login-personal' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'login-work' })).toBeTruthy()
    await ui.unmount()
  } finally {
    SCRIPT_OUT.json = JSON.stringify(ROWS)
  }
})
