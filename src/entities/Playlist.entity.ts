import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
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

  @ManyToOne(() => User, (user) => user.playlists)
  @JoinColumn()
  user: User;

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
  @OneToMany(() => PlaylistItem, (playlistItem) => playlistItem.playlist)
  items: PlaylistItem[];

  /**
   * Playlist where is included current playlist
   */
  @OneToMany(() => PlaylistItem, (playlistItem) => playlistItem.playlistItem, {
    cascade: ["soft-remove"],
  })
  playlistItems: PlaylistItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
