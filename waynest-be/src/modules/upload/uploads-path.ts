import { join } from 'path';

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

export const getUploadsDir = () => {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured) {
    return configured;
  }

  // Most serverless providers expose writable storage only under /tmp.
  if (isServerlessRuntime()) {
    return '/tmp/waynest-uploads';
  }

  return join(process.cwd(), 'uploads');
};
