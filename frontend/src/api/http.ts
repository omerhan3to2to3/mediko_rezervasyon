const BASE = import.meta.env.VITE_API_BASE ?? ''

export type ProblemBody = { status: number; detail: string }

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

function authHeaders(init?: HeadersInit): Headers {
  const h = new Headers(init)
  const token = localStorage.getItem('token')
  if (token) {
    h.set('Authorization', `Bearer ${token}`)
  }
  return h
}

export async function apiFetchWithoutAuth<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const headers = new Headers(options.headers)
  const hasBody = options.body !== undefined && options.body !== null
  if (hasBody && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }
  if (!res.ok) {
    let detail = res.statusText
    if (parsed && typeof parsed === 'object' && parsed !== null && 'detail' in parsed) {
      detail = String((parsed as ProblemBody).detail)
    } else if (typeof parsed === 'string') {
      detail = parsed
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204 || text === '') {
    return null
  }
  return parsed as T
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const headers = authHeaders(options.headers)
  const hasBody = options.body !== undefined && options.body !== null
  if (hasBody && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!res.ok) {
    let detail = res.statusText
    if (parsed && typeof parsed === 'object' && parsed !== null && 'detail' in parsed) {
      detail = String((parsed as ProblemBody).detail)
    } else if (typeof parsed === 'string') {
      detail = parsed
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204 || text === '') {
    return null
  }

  return parsed as T
}
