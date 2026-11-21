const TOKEN_KEY = "hackcore.token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function formatUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(method: string, endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
  const hasBody = body !== undefined;
  const response = await fetch(formatUrl(endpoint), {
    ...options,
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
      ...options?.headers
    },
    body: hasBody ? JSON.stringify(body) : undefined
  });

  const raw = await response.text();
  let parsed: unknown;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!response.ok) {
    const serverMessage =
      typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : `${method} ${endpoint} failed with status ${response.status}`;
    throw new ApiError(response.status, serverMessage, parsed);
  }

  return parsed as T;
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>("GET", endpoint, undefined, options);
  },
  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>("POST", endpoint, body, options);
  },
  put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>("PUT", endpoint, body, options);
  },
  patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>("PATCH", endpoint, body, options);
  },
  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>("DELETE", endpoint, undefined, options);
  }
};
