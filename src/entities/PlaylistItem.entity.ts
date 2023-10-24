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

  /**
   * Dream of Playlist Item
   * Should be null if playlistItem exists
   */
  @ManyToOne(() => Dream)
  @JoinColumn()
  dreamItem: Dream;

  /**
   * Playlist of Playlist Item
   * Should be null if dreamItem exists
   */
  @ManyToOne(() => Playlist)
  @JoinColumn()
  playlistItem: Playlist;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
