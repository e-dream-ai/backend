import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
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
import { Vote } from "./Vote.entity";
import { DreamStatusType } from "types/dream.types";
import { ColumnNumericTransformer } from "transformers/numeric.transformer";
import { ColumnVideoTransformer } from "transformers/video.transformer";
import env from "shared/env";

@Entity()
export class Dream {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "string" })
  @Generated("uuid")
  uuid: string;

  @ManyToOne(() => User, (user) => user.dreams)
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
  @OneToOne(() => FeedItem, (feedItem) => feedItem.dreamItem, {
    cascade: ["soft-remove"],
  })
  feedItem: FeedItem;

  @Column({ nullable: true, type: "varchar" })
  name?: string | null;

  @Column({
    type: "enum",
    enum: DreamStatusType,
    default: DreamStatusType.NONE,
  })
  status: DreamStatusType;

  /**
   * processed video
   */
  @Column({
    nullable: true,
    type: "varchar",
    transformer: new ColumnVideoTransformer(),
  })
  video?: string | null;

  /**
   * Processed video size on bytes
   */
  @Column({ type: "bigint", nullable: true, default: null })
  processedVideoSize?: number | null;

  /**
   * Processed video frames
   */
  @Column({ type: "integer", nullable: true, default: null })
  processedVideoFrames?: number | null;

  /**
   * Processed video frames per second FPS
   */
  @Column({ type: "integer", nullable: true, default: null })
  processedVideoFPS?: number | null;

  /**
   * featureRank
   * default 0
   */
  @Column({ type: "integer", default: 0 })
  featureRank?: number;

  @Column({ nullable: true, type: "varchar" })
  original_video?: string | null;

  @Column({ nullable: true, type: "varchar" })
  thumbnail?: string | null;

  @OneToMany(() => Vote, (vote) => vote.dream)
  @JoinColumn()
  votes: Vote;

  @Column({ default: 0, type: "integer" })
  upvotes: number;

  @Column({ default: 0, type: "integer" })
  downvotes: number;

  @OneToMany(() => PlaylistItem, (playlistItem) => playlistItem.dreamItem, {
    cascade: ["soft-remove"],
  })
  playlistItems: PlaylistItem[];

  @Column({
    type: "decimal",
    default: 1.0,
    transformer: new ColumnNumericTransformer(),
  })
  activityLevel?: number;

  /**
   * nsfw flag
   */
  @Column({
    type: "boolean",
    default: false,
  })
  nsfw: boolean;

  // computed frontend url field
  frontendUrl: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @AfterLoad()
  computeFrontendUrl() {
    this.frontendUrl = `${env.FRONTEND_URL}/dream/${this.uuid}`;
  }
}
