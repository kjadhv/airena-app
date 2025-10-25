import { HttpService } from '@nestjs/axios';
export declare class ModerationService {
    private readonly httpService;
    private readonly filter;
    private readonly OPENAI_API_URL;
    constructor(httpService: HttpService);
    isProfane(text: string): boolean;
    isToxic(text: string): Promise<boolean>;
}
