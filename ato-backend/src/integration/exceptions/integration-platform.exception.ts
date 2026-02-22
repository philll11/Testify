import { HttpException, HttpStatus } from '@nestjs/common';

export class IntegrationPlatformException extends HttpException {
    constructor(
        message: string,
        public readonly externalStatusCode?: number,
        public readonly attempts?: number,
    ) {
        super(
            {
                message,
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                externalStatusCode,
                attempts,
                error: 'Integration Platform Error',
            },
            HttpStatus.SERVICE_UNAVAILABLE,
        );
    }
}
