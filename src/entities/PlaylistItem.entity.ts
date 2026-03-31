import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PlaylistItemType } from "types/playlist.types";
import { Dream } from "./Dream.entity";
import { Playlist } from "./Playlist.entity";

@Entity()
export class PlaylistItem {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Playlist which belongs the playlist item
   */
  @ManyToOne(() => Playlist)
  @JoinColumn()
  @Index()
  playlist: Playlist;

  @Column({
    type: "enum",
    enum: PlaylistItemType,
    default: PlaylistItemType.NONE,
  })
  @Index()
  type: PlaylistItemType;

  /**
   * Dream of the Playlist Item
   * Should be null if playlistItem exists
   */
  @ManyToOne(() => Dream, (dream) => dream.playlistItems, { nullable: true })
  @Index()
  dreamItem: Dream | null;

  /**
   * Playlist of the Playlist Item
   * Should be null if dreamItem exists
   */
  @ManyToOne(() => Playlist, (playlist) => playlist.playlistItems, {
    nullable: true,
  })
  @Index()
  playlistItem: Playlist | null;

  /**
   * Zero-based indexing for ordering
   * Set default order value to 0
   */
  @Column({ default: 0, type: "integer" })
  @Index()
  order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
