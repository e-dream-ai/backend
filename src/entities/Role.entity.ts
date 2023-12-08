import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RoleType } from "types/role.types";
import { User } from "./User.entity";

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  name: RoleType;

  /**
   *  users
   */
  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
