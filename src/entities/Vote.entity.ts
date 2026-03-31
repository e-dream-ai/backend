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
import { VoteType } from "types/vote.types";
import { Dream } from "./Dream.entity";
import { User } from "./User.entity";

@Entity()
export class Vote {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.votes)
  @JoinColumn()
  @Index()
  user: User;

  @ManyToOne(() => Dream, (dream) => dream.votes)
  @JoinColumn()
  @Index()
  dream: Dream;

  @Column({
    type: "enum",
    enum: VoteType,
    default: VoteType.NONE,
  })
  @Index()
  vote: VoteType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
