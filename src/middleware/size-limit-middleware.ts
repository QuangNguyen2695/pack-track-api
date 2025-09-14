import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class SizeLimitMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
        if (req.headers['content-length'] > 10485760) {
            return res.status(413).send('Payload too large');
        }
        next();
    }
}