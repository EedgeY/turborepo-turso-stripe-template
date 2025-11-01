import { NextRequest } from 'next/server';

/**
 * 同一オリジン検証（Origin/Refererヘッダーをチェック）
 * @param request - Next.jsリクエスト
 * @throws {Error} オリジンが許可リストに含まれない場合
 */
export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const inferred = origin ?? (referer ? new URL(referer).origin : null);

  const allowed = new Set(
    [
      request.nextUrl.origin,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ].filter(Boolean) as string[]
  );

  if (!inferred || !allowed.has(inferred)) {
    throw new Error('Forbidden: invalid origin');
  }
}

/**
 * CSRFトークン検証（ダブルサブミット方式）
 * @param request - Next.jsリクエスト
 * @throws {Error} CSRFトークンが一致しない場合
 */
export function assertCsrf(request: NextRequest) {
  const cookie = request.cookies.get('csrf_token')?.value;
  const header = request.headers.get('x-csrf-token');
  
  if (!cookie || !header || cookie !== header) {
    throw new Error('Forbidden: CSRF token invalid');
  }
}

