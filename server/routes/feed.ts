import type { MediaType } from '@server/constants/media';
import dataSource from '@server/datasource';
import { FeedItem } from '@server/entity/FeedItem';
import { Vote } from '@server/entity/Vote';
import type { FeedResponse } from '@server/interfaces/api/feedInterfaces';
import { feedQuery } from '@server/interfaces/api/feedInterfaces';
import logger from '@server/logger';
import { Router } from 'express';
import { ZodError } from 'zod';

const feedRoutes = Router();

/**
 * User-aware feed: unvoted items only, ordered by probabilistic weighted
 * interleave (PARTITION BY providerId, ORDER BY score DESC, then
 * ORDER BY (rn - 1 + sortJitter) / weight). sortJitter is an Exp(1)-distributed
 * value stored at rank time so ordering is stable for pagination but
 * probabilistic across providers proportional to their weights.
 */
feedRoutes.get<never, FeedResponse>('/', async (req, res, next) => {
  try {
    if (!req.user) {
      return next({ status: 500, message: 'User missing from request.' });
    }

    const { take, skip, mediaType } = feedQuery.parse(req.query);

    // Quote subquery alias columns so Postgres preserves case (unquoted identifiers fold to lowercase).
    const qb = dataSource
      .createQueryBuilder()
      .select('interleaved.id', 'id')
      .addSelect('interleaved."tmdbId"', 'tmdbId')
      .addSelect('interleaved."mediaType"', 'mediaType')
      .addSelect('interleaved.score', 'score')
      .addSelect('interleaved."providerId"', 'providerId')
      .from(
        (sub) =>
          sub
            .select('r.id', 'id')
            .addSelect('r.tmdbId', 'tmdbId')
            .addSelect('r.mediaType', 'mediaType')
            .addSelect('r.score', 'score')
            .addSelect('r.providerId', 'providerId')
            .addSelect('r.weight', 'weight')
            .addSelect('r.sortJitter', 'sortJitter')
            .addSelect(
              'ROW_NUMBER() OVER (PARTITION BY r.providerId ORDER BY r.score DESC)',
              'rn'
            )
            .from(FeedItem, 'r')
            .leftJoin(
              Vote,
              'v',
              'v.tmdbId = r.tmdbId AND v.mediaType = r.mediaType AND v.userId = :userId'
            )
            .where('v.id IS NULL')
            .andWhere('(r.mediaType = :mediaType OR :mediaType = :allVal)'),
        'interleaved'
      )
      .orderBy(
        '((interleaved.rn - 1 + interleaved."sortJitter") * 1.0 / COALESCE(NULLIF(interleaved.weight, 0), 1))',
        'ASC'
      )
      .skip(skip)
      .take(take)
      .setParameters({
        userId: req.user.id,
        mediaType,
        allVal: 'all',
      });

    const rows = await qb.getRawMany<{
      id: number;
      tmdbId: number;
      mediaType: string;
      score: number;
      providerId: string;
    }>();

    return res.status(200).json({
      pageInfo: {
        pages: 1,
        pageSize: take,
        results: rows.length,
        page: 1,
      },
      results: rows.map((row, index) => ({
        tmdbId: row.tmdbId,
        mediaType: row.mediaType as MediaType,
        score: row.score,
        position: index + 1,
        providerId: row.providerId,
      })),
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return next({ status: 400, message: 'Invalid feed query parameters.' });
    }
    logger.debug('Something went wrong retrieving feed.', {
      label: 'API',
      errorMessage: e instanceof Error ? e.message : undefined,
    });

    return next({ status: 500, message: 'Unable to retrieve feed.' });
  }
});

export default feedRoutes;
