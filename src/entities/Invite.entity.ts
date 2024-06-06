import {
  AfterInsert,
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";
import env from "shared/env";
import { Role } from "./Role.entity";

@Entity()
export class Invite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  code: string;

  @Column({ default: 0, type: "integer" })
  size: number;

  @OneToMany(() => User, (user) => user)
  users: User[];

  /**
   * signup role
   */
  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn()
  signupRole?: Role | null;

  // computed signup url field
  signupUrl: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @AfterInsert()
  @AfterLoad()
  computeSignupUrl() {
    const searchParams = new URLSearchParams();
    searchParams.append("invite", this.code);
    this.signupUrl = `${env.FRONTEND_URL}/signup?${searchParams.toString()}`;
  }
}
