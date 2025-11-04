import { Injectable } from '@nestjs/common';
import { ABR_PROFILES } from '../config/ffmpeg-abr.config';
import { spawn } from 'child_process';
import path from 'path';

@Injectable()
export class StreamAbrService {
  // Start FFmpeg with ABR for incoming RTMP
  startAbrTranscoding(streamKey: string): void {
    const input = `rtmp://localhost/live/${streamKey}`;
    const outputDir = path.join(__dirname, '../../media/live', streamKey);

    // FFmpeg ABR command
    const ffmpegArgs = [
      '-i', input,
      '-map', '0:v', '-map', '0:a',
      '-c:a', 'aac',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-hls_time', '4',
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments',
      '-var_stream_map', 'v:0,a:0 v:1,a:0 v:2,a:0 v:3,a:0',
      '-master_pl_name', 'master.m3u8',
    ];

    // Add resolutions and bitrates for each profile
    ABR_PROFILES.forEach((profile, i) => {
      ffmpegArgs.push(
        '-b:v:' + i, profile.bitrate,
        '-s:v:' + i, `${profile.width}x${profile.height}`,
        '-maxrate:v:' + i, profile.bitrate,
        '-bufsize:v:' + i, (parseInt(profile.bitrate) * 2) + 'k',
        '-hls_segment_filename', `${outputDir}/seg_${i}_%03d.ts`
      );
    });

    ffmpegArgs.push('-f', 'hls', `${outputDir}/stream_%v.m3u8`);

    // Start FFmpeg process
    spawn('ffmpeg', ffmpegArgs, { cwd: outputDir });
  }
}
