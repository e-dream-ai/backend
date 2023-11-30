import {
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
   * Feed Item
   */
  @OneToOne(() => FeedItem, (feedItem) => feedItem.dreamItem, {
    cascade: ["soft-remove"],
  })
  feedItem: FeedItem;

  @Column({ nullable: true, type: "varchar" })
  name?: string | null;

  @Column({ nullable: true, type: "varchar" })
  video?: string | null;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
