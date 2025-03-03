import {
  AfterLoad,
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
import { Dream } from "./Dream.entity";

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
  @Index()
  user: User;

  /**
   * displayed owner
   */
  @ManyToOne(() => User, (user) => user.keyframes, { nullable: true })
  @JoinColumn()
  @Index()
  displayedOwner?: User | null;

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

  // collection of Dreams that use this Keyframe as start keyframe
  @OneToMany(() => Dream, (dream) => dream.startKeyframe)
  dreamsStartingWith: Dream[];

  // collection of Dreams that use this Keyframe as end keyframe
  @OneToMany(() => Dream, (dream) => dream.endKeyframe)
  dreamsEndingWith: Dream[];

  dreams: Dream[] = [];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  // Combine startDreams and endDreams into dreams
  @AfterLoad()
  computeAllDreams() {
    const startDreams = this.dreamsStartingWith || [];
    const endDreams = this.dreamsEndingWith || [];

    // Deduplicate dreams
    const uniqueDreams = new Map();
    [...startDreams, ...endDreams].forEach((dream) => {
      uniqueDreams.set(dream.id, dream);
    });

    this.dreams = Array.from(uniqueDreams.values());
  }
}
