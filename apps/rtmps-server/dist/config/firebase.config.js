"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const E2E_TEST_MODE = process.env.E2E_TEST_MODE === 'true';
let effectiveAdmin;
if (E2E_TEST_MODE) {
    console.log('E2E_TEST_MODE: Firebase Admin SDK verifyIdToken is mocked.');
    const mockAuth = () => ({
        verifyIdToken: (token) => __awaiter(void 0, void 0, void 0, function* () {
            console.log(`E2E_TEST_MODE: Mock verifyIdToken called with token: ${token}`);
            switch (token) {
                case 'valid-e2e-firebase-token':
                    return {
                        uid: 'e2e-test-firebase-uid',
                        email: 'e2e@example.com',
                        name: 'E2E Test User',
                    };
                case 'expired-e2e-firebase-token': {
                    const err = new Error('Simulated token expired');
                    err.code = 'auth/id-token-expired';
                    throw err;
                }
                case 'invalid-e2e-firebase-token': {
                    const err = new Error('Simulated invalid token');
                    err.code = 'auth/argument-error';
                    throw err;
                }
                default: {
                    const err = new Error(`Unexpected token in E2E: ${token}`);
                    err.code = 'auth/invalid-custom-token';
                    throw err;
                }
            }
        }),
    });
    effectiveAdmin = Object.assign(Object.assign({}, admin), { apps: admin.apps, initializeApp: admin.initializeApp, credential: admin.credential, auth: mockAuth });
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
}
else {
    const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    requiredEnvVars.forEach((key) => {
        if (!process.env[key]) {
            throw new Error(`Missing Firebase environment variable: ${key}`);
        }
    });
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Firebase Admin SDK initialized successfully');
        }
        catch (error) {
            console.error('Firebase Admin Initialization Error:', error);
            throw error;
        }
    }
    effectiveAdmin = admin;
}
exports.default = effectiveAdmin;
//# sourceMappingURL=firebase.config.js.map