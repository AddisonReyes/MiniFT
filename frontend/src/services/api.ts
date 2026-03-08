const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type LoginResponse = {
  message: string;
  id: number;
  token: string;
  expires_at?: string;
};

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json().catch(() => null)) as
    | (LoginResponse & { error?: string })
    | null;
  if (!res.ok) throw new Error(data?.error ?? "Credenciales inválidas");
  if (!data?.token) throw new Error("Login response missing token");

  localStorage.setItem("token", data.token);
  if (data.expires_at) localStorage.setItem("token_expires_at", data.expires_at);
  localStorage.setItem("user_id", String(data.id));

  return data;
}

export async function signUp(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Error al registrarse");
  return res.json();
}

export async function signOut() {
  try {
    await fetch(`${API_URL}/api/auth/logout/`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expires_at");
    localStorage.removeItem("user_id");
  }
}
