import { NextRequest } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
const FFMPEG_PATH = "C:\\ffmpeg\\ffmpeg.exe";
export async function GET() {
  console.log("🔥 ENV CHECK (GET)", {
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    email: !!process.env.FIREBASE_CLIENT_EMAIL,
    key: !!process.env.FIREBASE_PRIVATE_KEY,
  });

  return new Response("ENV TEST OK");
}

export async function POST(req: NextRequest) {
  console.log("ENV CHECK (runtime)", {
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    email: !!process.env.FIREBASE_CLIENT_EMAIL,
    key: !!process.env.FIREBASE_PRIVATE_KEY,
  });
  try {
    const { videoUrl, start, end } = await req.json();

    if (!videoUrl || start == null || end == null) {
      return new Response("Invalid data", { status: 400 });
    }

    const duration = end - start;
    if (duration <= 0 || duration > 60) {
      return new Response("Clip must be 1–60 seconds", { status: 400 });
    }

    const id = crypto.randomUUID();
    const tmp = os.tmpdir();

    const input = path.join(tmp, `${id}_input`);
    const output = path.join(tmp, `${id}_clip.mp4`);

    /* 1️⃣ Download video */
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return new Response("Failed to fetch video", { status: 400 });
    }

    const buffer = Buffer.from(await videoRes.arrayBuffer());
    fs.writeFileSync(input, buffer);

    /* 2️⃣ Cut clip (accurate) */
    const cmd = `"${FFMPEG_PATH}" -y -i "${input}" -ss ${start} -t ${duration} -map 0:v:0 -map 0:a? -c:v libx264 -c:a aac "${output}"`;

await new Promise<void>((resolve, reject) => {
  exec(cmd, (err, _stdout, stderr) => {
    if (err) {
      console.error("FFmpeg error:", stderr);
      reject(err);
    } else {
      resolve();
    }
  });
});

    /* 3️⃣ Send clip */
    const clipBuffer = fs.readFileSync(output);

    /* 4️⃣ Cleanup */
    fs.unlinkSync(input);
    fs.unlinkSync(output);

    return new Response(clipBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="clip_${start}-${end}.mp4"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Clip failed", { status: 500 });
  }
}

