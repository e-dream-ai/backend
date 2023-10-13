import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";

@Entity()
export class Dream {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Generated("uuid")
  uuid: string;

  @ManyToOne(() => User, (user) => user.dreams)
  @JoinColumn()
  user: User;

  @Column({ nullable: true, type: "varchar" })
  name?: string | null;

  @Column({ nullable: true, type: "varchar" })
  video?: string | null;

  @Column({ nullable: true, type: "varchar" })
  thumbnail?: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
