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
import { User } from "./User.entity";

@Entity()
export class DefaultPlaylist {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   *  user
   */
  @ManyToOne(() => User, (user) => user.dreams)
  @JoinColumn()
  user: User;

  // Define a JSON column
  @Column({ type: "json" })
  data: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
