export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    email: !!process.env.FIREBASE_CLIENT_EMAIL,
    key: !!process.env.FIREBASE_PRIVATE_KEY,
  });
}
