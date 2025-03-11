import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { FeedItem } from "./FeedItem.entity";
import { PlaylistItem } from "./PlaylistItem.entity";
import { User } from "./User.entity";
import { PlaylistKeyframe } from "./PlaylistKeyframe";

@Entity()
export class Playlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "string" })
  @Generated("uuid")
  @Index()
  uuid: string;

  @ManyToOne(() => User, (user) => user.playlists)
  @JoinColumn()
  @Index()
  user: User;

  /**
   * displayed owner
   */
  @ManyToOne(() => User, (user) => user.dreams, { nullable: true })
  @JoinColumn()
  @Index()
  displayedOwner?: User | null;

  /**
   * Feed Item
   */
  @OneToOne(() => FeedItem, (feedItem) => feedItem.playlistItem, {
    cascade: ["soft-remove"],
  })
  feedItem: FeedItem;

  @Column({ nullable: true, type: "varchar" })
  name?: string | null;

  @Column({ nullable: true, type: "varchar" })
  thumbnail?: string | null;

  /**
   * Items which belong to current playlist
   */
  @OneToMany(() => PlaylistItem, (playlistItem) => playlistItem.playlist, {
    /**
     * soft-remove - helps to delete playlist items in cascade when a playlist is deleted
     * update - helps to update playlist items in cascade (to update playlist order)
     */
    cascade: ["soft-remove", "update"],
  })
  items: PlaylistItem[];

  /**
   * Keyframes which belong to current playlist
   */
  @OneToMany(() => PlaylistKeyframe, (playlistItem) => playlistItem.playlist, {
    /**
     * soft-remove - helps to delete keyframes items in cascade when a playlist is deleted
     * update - helps to update keyframes items in cascade (to update playlist order in case is needed)
     */
    cascade: ["soft-remove", "update"],
  })
  playlistKeyframes: PlaylistKeyframe[];

  /**
   * Playlist where is included current playlist
   */
  @OneToMany(() => PlaylistItem, (playlistItem) => playlistItem.playlistItem, {
    cascade: ["soft-remove"],
  })
  playlistItems: PlaylistItem[];

  /**
   * featureRank
   * default 0
   */
  @Column({ type: "integer", default: 0 })
  @Index()
  featureRank?: number;

  /**
   * nsfw flag
   */
  @Column({
    type: "boolean",
    default: false,
  })
  nsfw: boolean;

  /**
   * hidden flag
   */
  @Column({
    type: "boolean",
    default: false,
  })
  hidden: boolean;

  @CreateDateColumn()
  created_at: Date;

  /**
   * updated_at is considered to change in next cases
   * - After adding a processed dream to playlist
   * - After deleting a playlist item
   * - After playlist reordering
   * - After a dream is processed, will change all playlist updated_at field where this dream is included
   */
  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  /**
   * take child item thumbnail if is not set on current playlist
   */
  @AfterLoad()
  computeThumbnail() {
    if (this.thumbnail) {
      return;
    }

    const itemWithThumbnail = this?.items?.find(
      (item) =>
        Boolean(item?.dreamItem?.thumbnail) ||
        Boolean(item?.playlistItem?.thumbnail),
    );

    const newThumbnail =
      itemWithThumbnail?.dreamItem?.thumbnail ??
      itemWithThumbnail?.playlistItem?.thumbnail;

    if (newThumbnail) {
      this.thumbnail = newThumbnail;
    }
  }
}
