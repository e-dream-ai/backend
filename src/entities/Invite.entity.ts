import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";

@Entity()
export class Invite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  code: string;

  @Column({ default: 0, type: "integer" })
  size: number;

  @OneToMany(() => User, (user) => user)
  @JoinColumn()
  users: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
