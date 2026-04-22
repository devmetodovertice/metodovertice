type Level = 'info' | 'warn' | 'error'

export function log(level: Level, event: string, data: Record<string, unknown> = {}) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data })
  if (level === 'error') console.error(entry)
  else console.log(entry)
}
