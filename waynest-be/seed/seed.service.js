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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bethlehem_seed_1 = require("./bethlehem.seed");
let SeedService = class SeedService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    seedBethlehem() {
        return (0, bethlehem_seed_1.seedBethlehem)(this.dataSource);
    }
    async setupSubscriptionPlans(plansRepo, creditEngine) {
        const desired = {
            free: {
                plannerMonthly: 2,
                chatbot: { baseCredits: 5 },
                monthlyCredits: 5,
            },
            standard: {
                plannerMonthly: 10,
                chatbot: { baseCredits: 20 },
                monthlyCredits: 50,
            },
            ultra: {
                plannerMonthly: -1,
                chatbot: { baseCredits: -1 },
                monthlyCredits: 0,
            },
        };
        const results = [];
        for (const slug of Object.keys(desired)) {
            const plan = await plansRepo.findOne({ where: { slug } });
            if (!plan)
                continue;
            plan.features = { ...(plan.features || {}), ...desired[slug] };
            plan.monthlyCredits = desired[slug].monthlyCredits ?? plan.monthlyCredits;
            await plansRepo.save(plan);
            results.push({ slug, updated: true });
        }
        return results;
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SeedService);
//# sourceMappingURL=seed.service.js.map