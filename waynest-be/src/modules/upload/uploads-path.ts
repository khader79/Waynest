import { join } from 'path';

export const getUploadsDir = () =>
  process.env.UPLOADS_DIR?.trim() || join(process.cwd(), 'uploads');
