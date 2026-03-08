const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/csrf/`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.csrfToken;
}

export async function signIn(email: string, password: string) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(`${API_URL}/auth/login/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Credenciales inválidas");
  return res.json();
}

export async function signUp(email: string, password: string) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(`${API_URL}/auth/register/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Error al registrarse");
  return res.json();
}

export async function signOut() {
  const csrfToken = await getCsrfToken();
  await fetch(`${API_URL}/auth/logout/`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });
}
