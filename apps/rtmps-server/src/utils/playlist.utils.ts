// Utility to auto-generate master.m3u8 for ABR
import { ABR_PROFILES } from '../config/ffmpeg-abr.config';
import fs from 'fs';
import path from 'path';

export function generateMasterPlaylist(streamKey: string): void {
  const dir = path.join(__dirname, '../../media/live', streamKey);
  let master = '#EXTM3U\n';

  ABR_PROFILES.forEach((profile, i) => {
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${profile.bitrate.replace('k','000')},RESOLUTION=${profile.width}x${profile.height}\n`;
    master += `stream_${i}.m3u8\n`;
  });

  fs.writeFileSync(path.join(dir, 'master.m3u8'), master);
}
