const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Credenciales inválidas");
  return res.json();
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
  await fetch(`${API_URL}/api/auth/logout/`, {
    method: "POST",
    credentials: "include",
  });
}
