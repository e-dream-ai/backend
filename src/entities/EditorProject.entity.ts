import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";
import { Playlist } from "./Playlist.entity";
import { Dream } from "./Dream.entity";
import { EditorId } from "types/editor-project.types";

@Entity()
@Index(["userId", "editorId"])
export class EditorProject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "string" })
  @Generated("uuid")
  @Index()
  uuid: string;

  @ManyToOne(() => User)
  @JoinColumn()
  @Index()
  user: User;

  @Column({ type: "integer", nullable: true })
  userId: number | null;

  @ManyToOne(() => Playlist, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn()
  @Index()
  playlist?: Playlist | null;

  @Column({ type: "integer", nullable: true })
  playlistId: number | null;

  @Column({ type: "varchar", length: 64 })
  editorId: EditorId;

  @Column({ type: "varchar", length: 120 })
  name: string;

  @Column({ type: "jsonb" })
  state: Record<string, unknown>;

  @Column({ type: "integer", default: 1 })
  revision: number;

  @Column({ type: "integer", default: 1 })
  schemaVersion: number;

  @ManyToOne(() => Dream, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn()
  @Index()
  thumbnailDream?: Dream | null;

  @Column({ type: "integer", nullable: true })
  thumbnailDreamId: number | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  lockedBy: string | null;

  @Column({ type: "timestamp", nullable: true })
  lockedAt: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
