"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const bad_words_next_1 = __importDefault(require("bad-words-next"));
let ModerationService = class ModerationService {
    constructor(httpService) {
        this.httpService = httpService;
        this.OPENAI_API_URL = 'https://api.openai.com/v1/moderations';
        this.filter = new bad_words_next_1.default();
    }
    isProfane(text) {
        return this.filter.check(text);
    }
    isToxic(text) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                console.warn('OPENAI_API_KEY is not set. Skipping OpenAI moderation check.');
                return false;
            }
            try {
                const response = yield (0, rxjs_1.firstValueFrom)(this.httpService.post(this.OPENAI_API_URL, { input: text }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }));
                return ((_a = response.data.results[0]) === null || _a === void 0 ? void 0 : _a.flagged) || false;
            }
            catch (error) {
                if (error.response) {
                    console.error('OpenAI Moderation API request failed:', error.response.data);
                }
                else {
                    console.error('An unknown error occurred with the OpenAI API:', error.message);
                }
                return false;
            }
        });
    }
};
exports.ModerationService = ModerationService;
exports.ModerationService = ModerationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], ModerationService);
//# sourceMappingURL=moderation.service.js.map