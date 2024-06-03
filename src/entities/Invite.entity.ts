import {
  AfterLoad,
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
import env from "shared/env";

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

  // computed signup url field
  signupUrl: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @AfterLoad()
  computeSignupUrl() {
    this.signupUrl = `${env.FRONTEND_URL}/signup?invite=${this.code}`;
  }
}
