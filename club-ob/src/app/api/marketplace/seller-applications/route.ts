import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getObTeam } from '@/lib/ob-team';
import { submitSellerApplication } from '@/lib/marketplaceApi';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_MAX_KEYS = 10_000;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

const documentSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z
    .string()
    .url()
    .max(500)
    .refine((value) => value.startsWith('https://'), 'HTTPS obligatoire'),
});

const schema = z.object({
  businessName: z.string().trim().min(2).max(191),
  ownerName: z.string().trim().min(2).max(191),
  email: z.string().email().max(191),
  phone: z.string().trim().max(32).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  activityCategory: z.string().trim().max(120).optional(),
  taxId: z.string().trim().max(120).optional(),
  tradeRegister: z.string().trim().max(120).optional(),
  documents: z.array(documentSchema).max(5).optional(),
});

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip') || 'unknown';
}

function consumeRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  if (requestBuckets.size >= RATE_LIMIT_MAX_KEYS) {
    for (const [bucketKey, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
    }
  }

  const bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function POST(req: NextRequest) {
  const limit = consumeRateLimit(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  try {
    const team = await getObTeam();
    if (!team) {
      return NextResponse.json({ error: 'Club indisponible' }, { status: 503 });
    }
    const body = schema.parse(await req.json());
    const application = await submitSellerApplication(team.id, body);
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Demande impossible' },
      { status: 502 },
    );
  }
}
