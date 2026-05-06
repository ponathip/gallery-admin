const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ApiOptions = RequestInit & {
  json?: unknown;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { json, headers, body, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : body,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || `API Error: ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json();
}

export async function apiData<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const res = await apiFetch<{ data: T }>(path, options);
  return res.data;
}