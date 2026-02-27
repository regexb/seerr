import type { MediaType } from '@server/constants/media';
import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type FeedSourceType = 'external' | 'in_library';

@Entity({ name: 'feed_items' })
@Index(['providerId', 'tmdbId', 'mediaType'], { unique: true })
@Index(['tmdbId', 'mediaType'])
export class FeedItem {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'varchar' })
  @Index()
  public providerId: string;

  @Column({ type: 'integer' })
  public tmdbId: number;

  @Column({ type: 'varchar' })
  public mediaType: MediaType;

  @Column({ type: 'real', default: 0 })
  public score: number;

  @Column({ type: 'real', default: 1 })
  public weight: number;

  @Column({ type: 'real', default: 0 })
  public sortJitter: number;

  @Column({ type: 'varchar', default: 'external' })
  public sourceType: FeedSourceType;

  @Column({ type: 'simple-json', nullable: true })
  public data?: Record<string, unknown>;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<FeedItem>) {
    Object.assign(this, init);
  }
}
