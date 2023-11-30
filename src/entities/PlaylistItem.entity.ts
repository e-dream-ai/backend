import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
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
  playlist: Playlist;

  @Column({
    type: "enum",
    enum: PlaylistItemType,
    default: PlaylistItemType.NONE,
  })
  type: PlaylistItemType;

  /**
   * Dream of the Playlist Item
   * Should be null if playlistItem exists
   */
  @ManyToOne(() => Dream, (dream) => dream.playlistItems)
  dreamItem: Dream;

  /**
   * Playlist of the Playlist Item
   * Should be null if dreamItem exists
   */
  @ManyToOne(() => Playlist, (playlist) => playlist.playlistItems)
  playlistItem: Playlist;

  @Column({ default: 0, type: "integer" })
  order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
