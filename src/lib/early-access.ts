export const EARLY_ACCESS_LIMITS = {
  fullNameMin: 2,
  fullNameMax: 120,
  emailMin: 5,
  emailMax: 320,
  organizationMax: 160,
  cityMax: 120,
  interestMax: 2000,
  trackingMax: 200,
} as const;

export interface EarlyAccessRawInput {
  audience: string;
  name: string;
  email: string;
  organization?: string | null | undefined;
  city?: string | null | undefined;
  interest?: string | null | undefined;
  source?: string | null | undefined;
  referral?: string | null | undefined;
  campaign?: string | null | undefined;
  userId?: string | null | undefined;
  consent: boolean;
}

export interface EarlyAccessInsertPayload {
  audience: string;
  full_name: string;
  email: string;
  organization: string | null;
  city: string | null;
  interest: string | null;
  source: string | null;
  referral: string | null;
  campaign: string | null;
  user_id: string | null;
  consent: true;
}

export type EarlyAccessBuildResult =
  | { ok: true; payload: EarlyAccessInsertPayload }
  | { ok: false; error: string };

function trimOptional(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function buildEarlyAccessPayload(input: EarlyAccessRawInput): EarlyAccessBuildResult {
  if (!input.consent) {
    return {
      ok: false,
      error: "Please confirm you are happy for IDee to contact you.",
    };
  }

  const fullName = input.name.trim();
  if (fullName.length < EARLY_ACCESS_LIMITS.fullNameMin) {
    return {
      ok: false,
      error: "Please enter your name (at least 2 characters).",
    };
  }
  if (fullName.length > EARLY_ACCESS_LIMITS.fullNameMax) {
    return {
      ok: false,
      error: `Name must be ${EARLY_ACCESS_LIMITS.fullNameMax} characters or fewer.`,
    };
  }

  const email = input.email.trim();
  if (
    email.length < EARLY_ACCESS_LIMITS.emailMin ||
    email.length > EARLY_ACCESS_LIMITS.emailMax ||
    !email.includes("@")
  ) {
    return {
      ok: false,
      error: "Please enter a valid email address.",
    };
  }

  const organization =
    input.audience === "consumer"
      ? null
      : trimOptional(input.organization, EARLY_ACCESS_LIMITS.organizationMax);

  return {
    ok: true,
    payload: {
      audience: input.audience,
      full_name: fullName,
      email,
      organization,
      city: trimOptional(input.city, EARLY_ACCESS_LIMITS.cityMax),
      interest: trimOptional(input.interest, EARLY_ACCESS_LIMITS.interestMax),
      source: trimOptional(input.source, EARLY_ACCESS_LIMITS.trackingMax),
      referral: trimOptional(input.referral, EARLY_ACCESS_LIMITS.trackingMax),
      campaign: trimOptional(input.campaign, EARLY_ACCESS_LIMITS.trackingMax),
      user_id: input.userId ?? null,
      consent: true,
    },
  };
}
