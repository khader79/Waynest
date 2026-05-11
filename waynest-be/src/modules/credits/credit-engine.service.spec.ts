import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { CreditEngineService } from './credit-engine.service';
import { CreditWallet } from './entities/credit-wallet.entity';
import {
  CreditTransaction,
  CreditTransactionType,
} from './entities/credit-transaction.entity';
import { BadRequestException } from '@nestjs/common';

describe('CreditEngineService', () => {
  let service: CreditEngineService;
  let walletsRepo: Repository<CreditWallet>;
  let txRepo: Repository<CreditTransaction>;
  let dataSource: DataSource;

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockManager)),
    getRepository: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn(),
  };

  const mockUser = { id: 'user-123' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditEngineService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: 'CreditWalletRepository',
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'CreditTransactionRepository',
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    })
      .overrideProvider('CreditWalletRepository')
      .useValue(walletsRepo)
      .overrideProvider('CreditTransactionRepository')
      .useValue(txRepo)
      .compile();

    service = module.get<CreditEngineService>(CreditEngineService);
    dataSource = module.get<DataSource>(DataSource);
    walletsRepo = module.get('CreditWalletRepository');
    txRepo = module.get('CreditTransactionRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return wallet balance', async () => {
      const wallet = { balance: '100' };
      jest.spyOn(walletsRepo, 'findOne').mockResolvedValue(wallet as any);

      const balance = await service.getBalance('user-123');
      expect(balance).toBe('100');
    });

    it('should return 0 if wallet not found', async () => {
      jest.spyOn(walletsRepo, 'findOne').mockResolvedValue(null);

      const balance = await service.getBalance('user-123');
      expect(balance).toBe('0');
    });
  });

  describe('charge', () => {
    it('should throw on negative amount', async () => {
      await expect(service.charge('user-123', -10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw on insufficient balance', async () => {
      const wallet = { balance: '10', reserved: '0', user: mockUser };
      mockManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(wallet),
        save: jest.fn(),
        create: jest.fn(),
      });
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockManager),
      );

      await expect(service.charge('user-123', 20)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully charge credits', async () => {
      const wallet = {
        id: 'wallet-1',
        balance: '100',
        reserved: '0',
        user: mockUser,
      };
      const tx = {
        id: 'tx-1',
        amount: '-10',
        type: CreditTransactionType.CONSUMPTION,
      };

      const mockWalletRepo = {
        findOne: jest.fn().mockResolvedValue(wallet),
        save: jest.fn().mockResolvedValue({ ...wallet, balance: '90' }),
      };

      const mockTxRepo = {
        create: jest.fn().mockReturnValue(tx),
        save: jest.fn().mockResolvedValue(tx),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === CreditWallet) return mockWalletRepo;
        if (entity === CreditTransaction) return mockTxRepo;
      });

      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockManager),
      );

      const result = await service.charge('user-123', 10, { feature: 'chat' });
      expect(result).not.toBeNull();
      expect((result as any)?.amount).toBe('-10');
      expect(mockWalletRepo.save).toHaveBeenCalled();
    });
  });

  describe('grant', () => {
    it('should throw on negative amount', async () => {
      await expect(service.grant('user-123', -10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create wallet if not exists', async () => {
      const mockWalletRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({ balance: '0', user: mockUser }),
        save: jest.fn().mockResolvedValue({
          id: 'wallet-1',
          balance: '100',
          user: mockUser,
        }),
      };

      const mockTxRepo = {
        create: jest.fn().mockReturnValue({ id: 'tx-1', amount: '100' }),
        save: jest.fn().mockResolvedValue({ id: 'tx-1', amount: '100' }),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === CreditWallet) return mockWalletRepo;
        if (entity === CreditTransaction) return mockTxRepo;
      });

      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockManager),
      );

      const result = await service.grant('user-123', 100);
      expect(result).not.toBeNull();
      expect((result as any)?.amount).toBe('100');
      expect(mockWalletRepo.create).toHaveBeenCalled();
    });
  });

  describe('reserve & commit', () => {
    it('should reserve credits', async () => {
      const wallet = {
        id: 'wallet-1',
        balance: '100',
        reserved: '0',
        user: mockUser,
      };

      const mockWalletRepo = {
        findOne: jest.fn().mockResolvedValue(wallet),
        save: jest.fn().mockResolvedValue({ ...wallet, reserved: '10' }),
      };

      mockManager.getRepository.mockReturnValue(mockWalletRepo);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockManager),
      );

      const result = await service.reserve('user-123', 10, 'ref-123');
      expect(result.amount).toBe(10);
      expect(mockWalletRepo.save).toHaveBeenCalled();
    });

    it('should commit reservation', async () => {
      const wallet = {
        id: 'wallet-1',
        balance: '100',
        reserved: '10',
        user: mockUser,
      };

      const mockWalletRepo = {
        findOne: jest.fn().mockResolvedValue(wallet),
        save: jest.fn(),
      };

      const mockTxRepo = {
        create: jest.fn().mockReturnValue({ id: 'tx-1', amount: '-10' }),
        save: jest.fn(),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === CreditWallet) return mockWalletRepo;
        if (entity === CreditTransaction) return mockTxRepo;
      });

      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockManager),
      );

      // Create reservation
      await service.reserve('user-123', 10, 'ref-123');

      // Commit
      const result = await service.commitReservation('user-123', 'ref-123');
      expect(result).not.toBeNull();
      expect((result as any)?.amount).toBe('-10');
    });

    it('should fail commit if reservation not found', async () => {
      await expect(
        service.commitReservation('user-123', 'nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refund', () => {
    it('should refund credits', async () => {
      const mockWalletRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ balance: '50', reserved: '0', user: mockUser }),
        save: jest.fn(),
      };

      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({ id: 'tx-1', amount: '20' }),
        save: jest.fn(),
      };

      mockManager.getRepository.mockImplementation((entity) => {
        if (entity === CreditWallet) return mockWalletRepo;
        if (entity === CreditTransaction) return mockTxRepo;
      });

      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockManager),
      );

      const result = await service.refund(
        'user-123',
        20,
        'charge-123',
        'test refund',
      );
      expect(result).not.toBeNull();
      expect((result as any)?.amount).toBe('20');
    });
  });
});
