export function GET() {
  return Response.json(
    { service: 'marsam', status: 'ok' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
