"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Info, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="input pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowForgotHelp((v) => !v)}
          className="mt-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Forgot your password?
        </button>
        {showForgotHelp && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            Ask your admin to reset it for you from Admin → Users.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
