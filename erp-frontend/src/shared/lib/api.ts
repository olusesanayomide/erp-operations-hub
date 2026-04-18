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
const DEFAULT_API_TIMEOUT_MS = 20000;
const API_TIMEOUT_MESSAGE =
  "The server is taking too long to respond. Please try again.";
export const AUTH_API_ERROR_EVENT = "manifest:auth-api-error";

export type AuthApiErrorEventDetail = {
  status: 401 | 403;
  message: string;
};

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
  accessToken?: string | null;
  body?: BodyInit | object | null;
  timeoutMs?: number;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function createTimeoutSignal(
  externalSignal: AbortSignal | null | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
    timeoutId = window.setTimeout(() => {
      controller.abort(new DOMException(API_TIMEOUT_MESSAGE, "TimeoutError"));
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    },
  };
}

function notifyAuthApiError(detail: AuthApiErrorEventDetail) {
  window.dispatchEvent(
    new CustomEvent<AuthApiErrorEventDetail>(AUTH_API_ERROR_EVENT, {
      detail,
    }),
  );
}

export async function apiRequest<T>(
  path: string,
  init: RequestInitWithJson = {},
): Promise<T> {
  const token =
    init.accessToken !== undefined ? init.accessToken : await resolveAuthToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body && typeof init.body === "object" && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  const timeoutMs = init.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const { accessToken: _accessToken, timeoutMs: _timeoutMs, signal: externalSignal, ...fetchInit } = init;
  const timeout = createTimeoutSignal(externalSignal, timeoutMs);

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchInit,
      headers,
      signal: timeout.signal,
      body:
        init.body && typeof init.body === "object" && !(init.body instanceof FormData)
          ? JSON.stringify(init.body)
          : init.body ?? undefined,
    });
  } catch (error) {
    if (isAbortError(error) || timeout.signal.reason instanceof DOMException) {
      const reason = timeout.signal.reason;
      throw new ApiError(
        reason instanceof DOMException && reason.name === "TimeoutError"
          ? API_TIMEOUT_MESSAGE
          : "The request was cancelled before it completed.",
        0,
      );
    }

    throw new ApiError(
      `Unable to reach the ERP backend at ${API_BASE_URL}. Make sure the API server is running.`,
      0,
    );
  } finally {
    timeout.cleanup();
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

    if (response.status === 401 || response.status === 403) {
      notifyAuthApiError({
        status: response.status,
        message,
      });
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
