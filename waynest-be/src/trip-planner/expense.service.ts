import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async create(dto: CreateExpenseDto, paidById: string): Promise<Expense> {
    const expense = this.expenseRepo.create({
      description: dto.description,
      totalAmount: dto.totalAmount,
      currencyCode: dto.currencyCode ?? 'ILS',
      date: dto.date ?? null,
      category: dto.category ?? null,
      splitAmongUserIds: dto.splitAmongUserIds,
      paidById,
      tripPlanId: dto.tripPlanId,
    });
    const saved = await this.expenseRepo.save(expense);
    this.logger.debug(`Created expense ${saved.id} for trip ${dto.tripPlanId}`);
    return saved;
  }

  async findByTripPlan(tripPlanId: string): Promise<Expense[]> {
    return this.expenseRepo.find({
      where: { tripPlanId },
      relations: ['paidBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expenseRepo.findOne({
      where: { id },
      relations: ['paidBy'],
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async remove(id: string, userId: string): Promise<void> {
    const expense = await this.findOne(id);
    if (expense.paidById !== userId) {
      throw new ForbiddenException('Only the payer can remove this expense');
    }
    await this.expenseRepo.softDelete(id);
    this.logger.debug(`Deleted expense ${id}`);
  }

  async toggleSettled(id: string, userId: string): Promise<Expense> {
    const expense = await this.findOne(id);
    if (expense.paidById !== userId) {
      throw new ForbiddenException('Only the payer can toggle settlement');
    }
    expense.isSettled = !expense.isSettled;
    const saved = await this.expenseRepo.save(expense);
    this.logger.debug(`Toggled settlement for expense ${id} → ${saved.isSettled}`);
    return saved;
  }
}
