import { Router, Request, Response } from 'express';
import { AppError } from '../core/errors/AppError';
import { getContainer } from './container';

export function createProfileImageRouter(): Router {
  const router = Router();

  router.get('/api/profile-images/:userId/:kind', async (req: Request, res: Response) => {
    const userId = String(req.params.userId);
    const kind = String(req.params.kind);
    try {
      if (kind !== 'avatar' && kind !== 'cover') {
        throw AppError.notFound('Profile image not found');
      }
      const image = await getContainer().profilePhotos.getImage(userId, kind);
      if (!image) throw AppError.notFound('Profile image not found');

      const quotedEtag = `"${image.etag}"`;
      if (req.headers['if-none-match'] === quotedEtag || req.headers['if-none-match'] === image.etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Content-Length', String(image.data.length));
      res.setHeader('ETag', quotedEtag);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.end(image.data);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message, code: err.code });
        return;
      }
      throw err;
    }
  });

  return router;
}
