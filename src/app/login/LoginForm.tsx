"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);

    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        throw new Error("Login failed");
    }

      toast.success("Login success");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8"
      >
        <p className="text-xs uppercase tracking-[0.24em] text-black/40">
          Admin Login
        </p>

        <h1 className="max-w-full text-[38px] font-serif text-black/50 leading-none tracking-tight text-neutral-500 sm:text-5xl first-letter:text-[1.55em] first-letter:mr-[1px]">PhanatchaNuch</h1>

        <div className="mt-8 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-black/40">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-3 w-full rounded-xl text-black/50 border border-black/10 px-4 py-4 outline-none focus:border-black"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-black/40">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-3 w-full rounded-xl text-black/50 border border-black/10 px-4 py-4 outline-none focus:border-black"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 flex w-full items-center justify-between rounded-full bg-black px-6 py-4 text-xs uppercase tracking-[0.18em] text-white disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"} <span>→</span>
        </button>
      </form>
    </main>
  );
}