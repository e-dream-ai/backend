import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { RecentItemType } from "types/recent-item.types";
import { Dream } from "./Dream.entity";
import { User } from "./User.entity";

@Entity()
@Unique(["userId", "type", "dreamId"])
@Index(["userId", "type", "lastUsedAt"])
export class UserRecentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn()
  user: User;

  @Column({ type: "integer" })
  userId: number;

  @Column({ type: "enum", enum: RecentItemType })
  type: RecentItemType;

  @ManyToOne(() => Dream, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn()
  @Index()
  dream: Dream;

  @Column({ type: "integer" })
  dreamId: number;

  @Column({ type: "timestamp", default: () => "now()" })
  lastUsedAt: Date;
}
