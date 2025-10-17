// src/reports/reports.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

// Define the shape of the request object after the guard runs
interface RequestWithUser extends Request {
    user: {
        uid: string;
    }
}

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  reportedContentId!: string; 

  @IsString()
  @IsNotEmpty()
  reportedUserId!: string; 

  @IsIn(['chat', 'stream'])
  contentType!: 'chat' | 'stream'; 

  @IsString()
  @IsNotEmpty()
  reason!: string; 
}

@Controller('reports')
@UseGuards(FirebaseAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async createReport(@Body() createReportDto: CreateReportDto, @Req() req: RequestWithUser) {
    const reporterId = req.user.uid;
    const report = await this.reportsService.create(createReportDto, reporterId);
    return {
      message: 'Report submitted successfully.',
      reportId: report.id,
    };
  }
}