import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Webhook the Django admin calls after publishing content, so ISR pages
 * refresh without a redeploy. Guarded by REVALIDATE_SECRET.
 */
export async function POST(request: Request) {
  // TODO: verify the secret, read { tag } from the body, revalidateTag(tag).
  void revalidateTag;
  void request;
  return NextResponse.json({ revalidated: false });
}
