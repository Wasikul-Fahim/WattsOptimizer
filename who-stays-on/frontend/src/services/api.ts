// All backend communication lives here. Components and hooks never call fetch directly.
import type {
  MarketInput,
  Role,
  RosterResponse,
  TodayResponse,
  User,
  UserRecord,
} from "@/types/api";

/** Same-origin by default (FastAPI serves the built app). Override with VITE_API_BASE. */
const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init: RequestInit = {}, okStatuses: number[] = []): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "same-origin",
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running on port 8000?");
  }
  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (res.ok || okStatuses.includes(res.status)) return body as T;
  const detail =
    (body && typeof body === "object" && ("detail" in body ? (body as { detail: unknown }).detail : (body as { message?: unknown }).message)) ||
    res.statusText ||
    "Request failed";
  throw new ApiError(res.status, String(detail), body);
}

// ---- Roster -----------------------------------------------------------------------------

/** POST /api/roster — open endpoint. 400/413 come back as `invalid_input` bodies, not errors. */
export function postRoster(input: MarketInput | unknown): Promise<RosterResponse> {
  return request<RosterResponse>("/api/roster", { method: "POST", body: JSON.stringify(input) }, [400, 413]);
}

/** POST /api/roster/today — secretary: compute and publish today's roster. */
export function publishTodayRoster(input: MarketInput | unknown): Promise<RosterResponse> {
  return request<RosterResponse>("/api/roster/today", { method: "POST", body: JSON.stringify(input) }, [400, 413]);
}

/** GET /api/today — the roster last published by a secretary. */
export function getToday(): Promise<TodayResponse> {
  return request<TodayResponse>("/api/today");
}

// ---- Auth -------------------------------------------------------------------------------

export function login(username: string, password: string): Promise<User> {
  return request<User>("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export function logout(): Promise<{ ok: boolean }> {
  return request("/api/logout", { method: "POST" });
}

export function getMe(): Promise<User> {
  return request<User>("/api/me");
}

// ---- Users (admin) ----------------------------------------------------------------------

export function listUsers(): Promise<UserRecord[]> {
  return request<UserRecord[]>("/api/users");
}

export function createUser(username: string, password: string, role: Role): Promise<{ ok: boolean }> {
  return request("/api/users", { method: "POST", body: JSON.stringify({ username, password, role }) });
}

export function deleteUser(username: string): Promise<{ ok: boolean }> {
  return request(`/api/users/${encodeURIComponent(username)}`, { method: "DELETE" });
}

export const api = {
  postRoster,
  publishTodayRoster,
  getToday,
  login,
  logout,
  getMe,
  listUsers,
  createUser,
  deleteUser,
};
