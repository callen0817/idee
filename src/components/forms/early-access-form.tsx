import { useState, type FormEvent } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { audiences, type Audience } from "@/data/content";
import { supabase } from "@/integrations/supabase/client";
import { buildEarlyAccessPayload, EARLY_ACCESS_LIMITS } from "@/lib/early-access";

export function EarlyAccessForm({
  defaultAudience = "consumer",
  compact = false,
}: {
  defaultAudience?: Audience;
  compact?: boolean;
}) {
  const [audience, setAudience] = useState<Audience>(defaultAudience);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const current = audiences.find((item) => item.value === audience);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams(window.location.search);

    const validated = buildEarlyAccessPayload({
      audience,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      organization: String(form.get("organization") ?? ""),
      city: String(form.get("city") ?? ""),
      interest: String(form.get("interest") ?? ""),
      source: params.get("utm_source"),
      referral: params.get("ref"),
      campaign: params.get("utm_campaign"),
      consent,
    });

    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setState("saving");
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("early_access_submissions").insert({
        ...validated.payload,
        user_id: user?.id ?? null,
      });
      if (insertError) {
        setState("error");
        setError("We couldn’t save that yet. Please check your details and try again.");
        return;
      }
      setState("success");
    } catch {
      setState("error");
      setError("We couldn’t reach the server. Please check your connection and try again.");
    }
  }

  if (state === "success") {
    return (
      <div className="glass-surface grid min-h-80 place-items-center rounded-2xl p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary">
            <Check />
          </span>
          <h3 className="mt-6 font-display text-3xl">You’re in the Circle.</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            We’ll share meaningful progress—not noise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-surface rounded-2xl p-5 sm:p-8">
      <div className={compact ? "grid gap-4" : "grid gap-5 sm:grid-cols-2"}>
        <div className="sm:col-span-2">
          <Label htmlFor="audience">I’m interested as a</Label>
          <Select value={audience} onValueChange={(value) => setAudience(value as Audience)}>
            <SelectTrigger id="audience" className="mt-2 h-12 rounded-xl bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {audiences.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">{current?.prompt}</p>
        </div>
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          minLength={EARLY_ACCESS_LIMITS.fullNameMin}
          maxLength={EARLY_ACCESS_LIMITS.fullNameMax}
          required
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          minLength={EARLY_ACCESS_LIMITS.emailMin}
          maxLength={EARLY_ACCESS_LIMITS.emailMax}
          required
        />
        {audience !== "consumer" && (
          <Field
            label="Organization"
            name="organization"
            autoComplete="organization"
            maxLength={EARLY_ACCESS_LIMITS.organizationMax}
          />
        )}
        <Field
          label="City"
          name="city"
          autoComplete="address-level2"
          maxLength={EARLY_ACCESS_LIMITS.cityMax}
        />
        <div className="sm:col-span-2">
          <Label htmlFor="interest">What would you like IDee to unlock?</Label>
          <Textarea
            id="interest"
            name="interest"
            maxLength={EARLY_ACCESS_LIMITS.interestMax}
            className="mt-2 min-h-28 rounded-xl bg-background/50"
          />
        </div>
        <div className="flex items-start gap-3 sm:col-span-2">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked === true)}
          />
          <Label htmlFor="consent" className="text-xs font-normal leading-5 text-muted-foreground">
            I’m happy for IDee to contact me about early access. I can unsubscribe at any time.
          </Label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={state === "saving"} className="sm:col-span-2">
          {state === "saving" && <LoaderCircle className="animate-spin" />}
          Join early access
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="mt-2 h-12 rounded-xl bg-background/50" {...props} />
    </div>
  );
}