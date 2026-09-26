import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    if (!(exception instanceof HttpException)) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    // HttpException 的响应体为对象时原样透传（如版本冲突携带的 current / changedFields），否则包装为 message
    const payload = body && typeof body === 'object' ? body : { message: exception instanceof HttpException ? exception.message : 'Internal server error' };
    response.status(status).json({ statusCode: status, ...payload, path: request.url, timestamp: new Date().toISOString() });
  }
}
