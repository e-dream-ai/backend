import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";
import { PlaylistKeyframe } from "./PlaylistKeyframe";

@Entity()
export class Keyframe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "string" })
  @Generated("uuid")
  @Index()
  uuid: string;

  @ManyToOne(() => User, (user) => user.keyframes)
  @JoinColumn()
  user: User;

  @Column({ nullable: true, type: "varchar" })
  name?: string | null;

  @Column({ nullable: true, type: "varchar" })
  image?: string | null;

  @OneToMany(
    () => PlaylistKeyframe,
    (PlaylistKeyframe) => PlaylistKeyframe.keyframe,
    {
      cascade: ["soft-remove"],
    },
  )
  playlistKeyframes: PlaylistKeyframe[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
