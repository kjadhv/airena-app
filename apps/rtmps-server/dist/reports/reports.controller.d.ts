import { ReportsService } from './reports.service';
interface RequestWithUser extends Request {
    user: {
        uid: string;
    };
}
export declare class CreateReportDto {
    reportedContentId: string;
    reportedUserId: string;
    contentType: 'chat' | 'stream';
    reason: string;
}
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    createReport(createReportDto: CreateReportDto, req: RequestWithUser): Promise<{
        message: string;
        reportId: string;
    }>;
}
export {};
