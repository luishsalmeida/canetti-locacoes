import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';

export function reportSyncAuth(req: Request, res: Response, next: NextFunction) {
  const configuredKey = process.env.REPORT_SYNC_KEY;
  const receivedKey = req.header('x-report-sync-key') || '';

  if (!configuredKey || configuredKey.length < 32) {
    return res.status(503).json({ error: 'Report synchronization is not configured' });
  }

  const expected = Buffer.from(configuredKey);
  const received = Buffer.from(receivedKey);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: 'Invalid report synchronization key' });
  }

  next();
}

