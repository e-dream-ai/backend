import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";
import { Vote } from "./Vote.entity";

@Entity()
export class Dream {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Generated("uuid")
  uuid: string;

  @ManyToOne(() => User, (user) => user.dreams)
  @JoinColumn()
  user: User;

  @Column({ nullable: true, type: "varchar" })
  name?: string | null;

  @Column({ nullable: true, type: "varchar" })
  video?: string | null;

  @Column({ nullable: true, type: "varchar" })
  thumbnail?: string | null;

  @OneToMany(() => Vote, (vote) => vote.dream)
  @JoinColumn()
  votes: Vote;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
