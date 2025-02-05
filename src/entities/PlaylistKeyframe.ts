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
import { Playlist } from "./Playlist.entity";
import { Keyframe } from "./Keyframe.entity";

@Entity()
export class PlaylistKeyframe {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Playlist which belongs the keyframe
   */
  @ManyToOne(() => Playlist)
  @JoinColumn()
  playlist: Playlist;

  /**
   * Keyframe
   */
  @ManyToOne(() => Keyframe, (keyframe) => keyframe.playlistKeyframes)
  keyframe: Keyframe;

  /**
   * Zero-based indexing for ordering
   * Set default order value to 0
   */
  @Column({ default: 0, type: "integer" })
  order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
