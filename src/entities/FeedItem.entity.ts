import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { FeedItemType } from "types/feed-item.types";
import { Dream } from "./Dream.entity";
import { Playlist } from "./Playlist.entity";
import { User } from "./User.entity";

@Entity()
export class FeedItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.dreams)
  @Index()
  user: User;

  @Column({
    type: "enum",
    enum: FeedItemType,
    default: FeedItemType.NONE,
  })
  @Index()
  type: FeedItemType;

  /**
   * Dream of Playlist Item
   * Should be null if playlistItem exists
   */
  @OneToOne(() => Dream, (dream) => dream.feedItem, {
    cascade: ["soft-remove"],
  })
  @JoinColumn()
  @Index()
  dreamItem: Dream;

  /**
   * Playlist of Playlist Item
   * Should be null if dreamItem exists
   */
  @OneToOne(() => Playlist, (playlist) => playlist.feedItem, {
    cascade: ["soft-remove"],
  })
  @JoinColumn()
  @Index()
  playlistItem: Playlist;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
