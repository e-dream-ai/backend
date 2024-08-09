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
  user: User;

  /**
   * displayed owner
   */
  @ManyToOne(() => User, (user) => user.dreams, { nullable: true })
  @JoinColumn()
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
  featureRank?: number;

  /**
   * nsfw flag
   */
  @Column({
    type: "boolean",
    default: false,
  })
  nsfw: boolean;

  @CreateDateColumn()
  created_at: Date;

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
