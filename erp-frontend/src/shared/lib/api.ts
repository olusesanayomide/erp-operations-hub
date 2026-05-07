import { getApiBaseUrl } from "./env";
import { supabase } from "./supabase";
import { OFFLINE_MESSAGE, isBrowserOnline } from "./online-status";

const API_BASE_URL = getApiBaseUrl();

const USER_STORAGE_KEY = "erp.auth.user";
const DEFAULT_API_TIMEOUT_MS = 20000;
const API_TIMEOUT_MESSAGE =
  "The server is taking too long to respond. Please try again.";
const API_CANCELLED_MESSAGE = "The request was cancelled before it completed.";
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

function humanizeValidationMessage(message: string) {
  const normalized = message.trim();

  switch (normalized) {
    case "adminEmail must be an email":
      return "Enter a valid email address.";
    case "adminEmail should not be empty":
      return "Email is required.";
    case "adminPassword should not be empty":
      return "Password is required.";
    case "adminPassword must be longer than or equal to 8 characters":
      return "Password must be at least 8 characters.";
    case "companyName should not be empty":
      return "Company name is required.";
    case "companyName must be a string":
      return "Company name is invalid.";
    case "adminName should not be empty":
      return "Your name is required.";
    case "adminName must be a string":
      return "Your name is invalid.";
    default:
      return normalized;
  }
}

function isReadRequest(method: string | undefined) {
  const normalizedMethod = method?.toUpperCase() ?? "GET";
  return normalizedMethod === "GET" || normalizedMethod === "HEAD";
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
  timeoutMessage?: string;
  timeoutMs?: number;
  allowStatuses?: number[];
};

function hasErrorName(error: unknown, name: string) {
  return error instanceof Error && error.name === name;
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || hasErrorName(error, "AbortError");
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "TimeoutError"
  ) || hasErrorName(error, "TimeoutError");
}

function createTimeoutSignal(
  externalSignal: AbortSignal | null | undefined,
  timeoutMs: number,
  timeoutMessage: string,
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
      controller.abort(new DOMException(timeoutMessage, "TimeoutError"));
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

function getTimeoutMessage(reason: unknown) {
  return reason instanceof Error && reason.message
    ? reason.message
    : API_TIMEOUT_MESSAGE;
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
  if (!isBrowserOnline() && !isReadRequest(init.method)) {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

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
  const timeoutMessage = init.timeoutMessage ?? API_TIMEOUT_MESSAGE;
  const {
    accessToken: _accessToken,
    timeoutMessage: _timeoutMessage,
    timeoutMs: _timeoutMs,
    allowStatuses: _allowStatuses,
    signal: externalSignal,
    ...fetchInit
  } = init;
  const timeout = createTimeoutSignal(externalSignal, timeoutMs, timeoutMessage);

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
    const abortReason = timeout.signal.reason;

    if (isTimeoutError(error) || isTimeoutError(abortReason)) {
      throw new ApiError(getTimeoutMessage(abortReason), 0);
    }

    if (isAbortError(error) || timeout.signal.aborted) {
      const reason = timeout.signal.reason;
      throw new ApiError(
        isTimeoutError(reason) ? getTimeoutMessage(reason) : API_CANCELLED_MESSAGE,
        0,
      );
    }

    throw new ApiError(
      `Unable to reach the ERP backend at ${API_BASE_URL}. Check that the deployed API is healthy and that this frontend origin is allowed by CORS.`,
      0,
    );
  } finally {
    timeout.cleanup();
  }

  if (!response.ok) {
    const allowStatuses = init.allowStatuses ?? [];

    if (allowStatuses.includes(response.status)) {
      return (await response.json()) as T;
    }

    let message = `Request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      if (typeof errorData?.message === "string") {
        message = humanizeValidationMessage(errorData.message);
      } else if (Array.isArray(errorData?.message)) {
        message = errorData.message.map(humanizeValidationMessage).join(", ");
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
