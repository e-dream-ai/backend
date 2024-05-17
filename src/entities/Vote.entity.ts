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
import { VoteType } from "types/vote.types";
import { Dream } from "./Dream.entity";
import { User } from "./User.entity";

@Entity()
export class Vote {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.votes, {
    cascade: ["soft-remove"],
  })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Dream, (dream) => dream.votes)
  @JoinColumn()
  dream: Dream;

  @Column({
    type: "enum",
    enum: VoteType,
    default: VoteType.NONE,
  })
  vote: VoteType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
