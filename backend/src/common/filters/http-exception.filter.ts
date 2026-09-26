import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    // 异常响应为对象时（如版本冲突携带 current/changedFields）原样透传，否则统一为 message
    const payload = typeof body === 'object' && body !== null ? body : { message: typeof body === 'string' ? body : exception instanceof HttpException ? exception.message : 'Internal server error' };
    response.status(status).json({ statusCode: status, ...payload, path: request.url, timestamp: new Date().toISOString() });
  }
}
