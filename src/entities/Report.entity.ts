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
import { Dream } from "./Dream.entity";

@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "string" })
  @Generated("uuid")
  @Index()
  uuid: string;

  @ManyToOne(() => Dream, (dream) => dream.reports)
  @JoinColumn()
  dream: Dream;

  @ManyToOne(() => User, (user) => user.reports)
  @JoinColumn()
  reportedBy: User;

  /**
   * processed flag
   */
  @Column({
    type: "boolean",
    default: false,
  })
  processed: boolean;

  @Column({ nullable: true, type: "varchar" })
  description?: string | null;

  @Column({ nullable: true, type: "varchar" })
  link?: string | null;

  /**
   * processed by user
   */
  @ManyToOne(() => User, (user) => user.processedReports, { nullable: true })
  @JoinColumn()
  processedBy: User | null;

  @Column({ type: "timestamp", nullable: true })
  reportedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  processedAt?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
