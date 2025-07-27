import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

import * as bcrypt from 'bcrypt';
export enum Role {
  ADMIN = 'Admin',
  TRAVELER = 'Traveler',
  PROVIDER = 'Service Provider',
}
export enum Status {
  ACTIVE = 'Active',
  BANNED = 'Banned',
  PENDING = 'Pending',
}
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  userid: number;
  @Column({ nullable: false })
  name: string;
  @Column({ unique: true })
  email: string;
  @Column()
  password: string;
  @Column({ type: 'enum', enum: Role, default: Role.TRAVELER })
  role: Role;
  @Column({ type: 'enum', enum: Status, default: Status.PENDING })
  status: Status;
  @CreateDateColumn()
  createdAt: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
}
