import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { StatusLabel } from "@/components/brand/status-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In to IDee" },
      {
        name: "description",
        content: "Sign in to My IDee to see your Circle, your participation and your invitations.",
      },
      { property: "og:title", content: "Sign In to IDee" },
      { property: "og:description", content: "Access My IDee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/my" });
    });
  }, [navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/my` },
        });
        if (signUpError) throw signUpError;
        setMessage("Check your email to confirm your address, then sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        await navigate({ to: "/my" });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (!("redirected" in result && result.redirected)) {
      await navigate({ to: "/my" });
    }
  }

  return (
    <PublicShell footer={false}>
      <section className="fog-scene flex min-h-screen items-center px-5 py-32 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="fade-up glass-surface rounded-[2rem] p-7 sm:p-9">
            <StatusLabel>Early access</StatusLabel>
            <h1 className="display-title mt-6 text-4xl">
              {mode === "sign-in" ? "SIGN IN." : "CREATE YOUR IDEE."}
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              My IDee is an early shell while the product is in development.
            </p>
            <Button variant="glass" className="mt-8 w-full" onClick={google} type="button">
              Continue with Google
            </Button>
            <div className="my-7 flex items-center gap-4 text-xs uppercase text-muted-foreground">
              <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={submit} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
              <Button type="submit" disabled={busy}>
                {busy && <LoaderCircle className="animate-spin" />}
                {mode === "sign-in" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <Button
              variant="ghost"
              type="button"
              className="mt-6 text-xs font-semibold text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                setError("");
                setMessage("");
              }}
            >
              {mode === "sign-in" ? "No account yet? Create one" : "Already have an IDee? Sign in"}
            </Button>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Not ready yet?{" "}
            <Link to="/early-access" className="font-semibold text-foreground">
              Register interest instead
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
