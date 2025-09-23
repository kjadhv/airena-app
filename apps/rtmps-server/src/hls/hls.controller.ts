import { Controller, Get, Param, Res, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { NmsService } from '../nms/nms.service'; // ADD THIS IMPORT

@Controller()
export class HlsController {
  private readonly logger = new Logger(HlsController.name);

  // INJECT NmsService to get the correct media root
  constructor(private readonly nmsService: NmsService) {
    // We can log the path at initialization to be sure
    const mediaRoot = this.nmsService.getMediaRoot();
    this.logger.log(`📺 HLS Controller initialized with media root: ${mediaRoot}`);
  }

  // --- SERVE HLS PLAYLIST (.m3u8) ---
  @Get('live/:streamKey/index.m3u8')
  servePlaylist(@Param('streamKey') streamKey: string, @Res() res: Response) {
    this.logger.log(`📺 Requesting playlist for stream: ${streamKey}`);
    
    // FIX: Get the media root from NmsService
    const mediaRoot = this.nmsService.getMediaRoot();
    const filePath = path.join(mediaRoot, 'live', streamKey, 'index.m3u8');
    this.logger.log(`📺 Looking for playlist at: ${filePath}`);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Log existing directories for debugging
      const liveDir = path.join(mediaRoot, 'live');
      let existingDirs = 'none';
      if (fs.existsSync(liveDir)) {
        try {
          const dirs = fs.readdirSync(liveDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          if (dirs.length > 0) {
            existingDirs = dirs.join(', ');
          }
        } catch (e) {
            existingDirs = 'Error reading directory';
        }
      }
      this.logger.warn(`⚠️ Stream directory does not exist: ${path.dirname(filePath)}`);
      this.logger.log(`📁 Existing stream directories: ${existingDirs}`);
      
      const errorMessage = `Stream ${streamKey} not found or not currently live`;
      this.logger.error(`❌ Error serving playlist for ${streamKey}: ${errorMessage}`);
      throw new NotFoundException(errorMessage);
    }
  }

  // --- SERVE HLS VIDEO SEGMENTS (.ts) ---
  @Get('live/:streamKey/:segment')
  serveSegment(
    @Param('streamKey') streamKey: string,
    @Param('segment') segment: string,
    @Res() res: Response,
  ) {
    // Only serve .ts files for security
    if (!segment.endsWith('.ts')) {
      throw new NotFoundException('Invalid segment format');
    }
    
    // FIX: Get the media root from NmsService
    const mediaRoot = this.nmsService.getMediaRoot();
    const filePath = path.join(mediaRoot, 'live', streamKey, segment);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'video/mp2t');
      fs.createReadStream(filePath).pipe(res);
    } else {
      throw new NotFoundException(`Segment ${segment} not found for stream ${streamKey}`);
    }
  }
}