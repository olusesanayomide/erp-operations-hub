import { supabase } from "./supabase";

const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:3000";

const API_BASE_URL = (() => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return DEFAULT_LOCAL_API_BASE_URL;
})();

const USER_STORAGE_KEY = "erp.auth.user";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getStoredUser<T>() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function setStoredUser(user: unknown) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }
  localStorage.removeItem(USER_STORAGE_KEY);
}

async function resolveAuthToken() {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

type RequestInitWithJson = RequestInit & {
  body?: BodyInit | object | null;
};

export async function apiRequest<T>(
  path: string,
  init: RequestInitWithJson = {},
): Promise<T> {
  const token = await resolveAuthToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body && typeof init.body === "object" && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      body:
        init.body && typeof init.body === "object" && !(init.body instanceof FormData)
          ? JSON.stringify(init.body)
          : init.body ?? undefined,
    });
  } catch {
    throw new ApiError(
      `Unable to reach the ERP backend at ${API_BASE_URL}. Make sure the API server is running.`,
      0,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      if (typeof errorData?.message === "string") {
        message = errorData.message;
      } else if (Array.isArray(errorData?.message)) {
        message = errorData.message.join(", ");
      } else if (typeof errorData?.error === "string") {
        message = errorData.error;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {
        // ignore secondary parsing errors
      }
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
