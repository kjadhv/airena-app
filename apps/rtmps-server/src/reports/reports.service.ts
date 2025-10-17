// src/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateReportDto } from './reports.controller';
import * as admin from 'firebase-admin';

@Injectable()
export class ReportsService {
  private reportsCollection: admin.firestore.CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.reportsCollection = this.firebaseService.getFirestore().collection('reports');
  }

  async create(reportDto: CreateReportDto, reporterId: string) {
    const newReport = {
      ...reportDto,
      reporterId,
      status: 'new', // 'new', 'in_review', 'resolved'
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const docRef = await this.reportsCollection.add(newReport);
    console.log(`New report created: ${docRef.id}`);
    return docRef;
  }
}