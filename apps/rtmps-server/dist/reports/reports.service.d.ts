import { FirebaseService } from '../firebase/firebase.service';
import { CreateReportDto } from './reports.controller';
import * as admin from 'firebase-admin';
export declare class ReportsService {
    private readonly firebaseService;
    private reportsCollection;
    constructor(firebaseService: FirebaseService);
    create(reportDto: CreateReportDto, reporterId: string): Promise<admin.firestore.DocumentReference<admin.firestore.DocumentData, admin.firestore.DocumentData>>;
}
