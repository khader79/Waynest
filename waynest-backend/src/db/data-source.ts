import 'reflect-metadata';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'root',
  database: 'Waynest',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/db/migrations/*.ts'],
  synchronize: false,
});
