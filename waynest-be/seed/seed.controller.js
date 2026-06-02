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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedController = void 0;
const common_1 = require("@nestjs/common");
const seed_service_1 = require("./seed.service");
const jwt_auth_guard_1 = require("../src/modules/auth/guards/jwt-auth.guard");
const role_guard_1 = require("../src/modules/auth/guards/role.guard");
const roles_decorator_1 = require("../src/modules/auth/roles.decorator");
const user_entity_1 = require("../src/modules/users/entities/user.entity");
const plan_entity_1 = require("../src/modules/subscriptions/entities/plan.entity");
let SeedController = class SeedController {
    seedService;
    constructor(seedService) {
        this.seedService = seedService;
    }
    seedBethlehem() {
        return this.seedService.seedBethlehem();
    }
    async setupSubscriptions() {
        // Admin-only route already guarded by class-level decorators
        // Use repositories via require to avoid circular DI in this simple seed endpoint
        const { AppDataSource } = require('../../src/common/data-source');
        const plansRepo = AppDataSource.getRepository(plan_entity_1.Plan);
        // Fallback: call internal seed helper with repos
        return this.seedService.setupSubscriptionPlans(plansRepo, null);
    }
};
exports.SeedController = SeedController;
__decorate([
    (0, common_1.Post)('bethlehem'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "seedBethlehem", null);
__decorate([
    (0, common_1.Post)('subscriptions-setup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "setupSubscriptions", null);
exports.SeedController = SeedController = __decorate([
    (0, common_1.Controller)('seed'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [seed_service_1.SeedService])
], SeedController);
//# sourceMappingURL=seed.controller.js.map