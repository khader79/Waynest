import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TranslationService } from '../translations/translation.service';

type ExceptionResponse = {
  message?: string | string[];
  messageKey?: string;
};

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly translationService: TranslationService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    let message = 'Internal server error';
    let messageKey: string | undefined;
    const acceptLanguage =
      typeof request.headers['accept-language'] === 'string'
        ? request.headers['accept-language']
        : undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const body = exceptionResponse as ExceptionResponse;
      if (typeof body.messageKey === 'string') {
        messageKey = body.messageKey;
        const translated = this.translationService.resolveApiErrorMessage(
          body.messageKey,
          acceptLanguage,
        );
        if (translated) {
          message = translated;
        } else {
          const candidate = body.message;
          if (Array.isArray(candidate)) {
            message = candidate.join(', ');
          } else if (typeof candidate === 'string') {
            message = candidate;
          }
        }
      } else {
        const candidate = body.message;
        if (Array.isArray(candidate)) {
          message = candidate.join(', ');
        } else if (typeof candidate === 'string') {
          message = candidate;
        }
      }
    } else if (exception instanceof Error && exception.message) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(messageKey ? { messageKey } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
