import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { ModelProvider } from "types/model.types";
import { User } from "./User.entity";

@Entity()
@Unique("UQ_USER_PROVIDER", ["user", "provider"])
export class UserProviderKey {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn()
  @Index()
  user: User;

  @Column({ type: "varchar", length: 32 })
  provider: ModelProvider;

  @Column({ type: "text" })
  encryptedKey: string;

  @Column({ type: "varchar", length: 64 })
  keyHash: string;

  @Column({ type: "boolean", default: false })
  isValid: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastValidatedAt: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
