import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

interface AuthRequest {
  user?: { sub: string };
}

@Controller('trip-planner')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post(':tripPlanId/expenses')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('tripPlanId') tripPlanId: string,
    @Body() dto: CreateExpenseDto,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user?.sub ?? '';
    return this.expenseService.create(
      { ...dto, tripPlanId },
      userId,
    );
  }

  @Get(':tripPlanId/expenses')
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('tripPlanId') tripPlanId: string) {
    return this.expenseService.findByTripPlan(tripPlanId);
  }

  @Delete('expenses/:id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    const userId = req.user?.sub ?? '';
    await this.expenseService.remove(id, userId);
    return { ok: true };
  }

  @Patch('expenses/:id/settle')
  @UseGuards(JwtAuthGuard)
  async toggleSettled(@Param('id') id: string, @Request() req: AuthRequest) {
    const userId = req.user?.sub ?? '';
    return this.expenseService.toggleSettled(id, userId);
  }
}
