import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { generateSecret } from "utils/crypto.util";
import { User } from "./User.entity";

@Entity()
// create an index on the 'apikey' column
@Index("IDX_APIKEY_KEY", ["apikey"])
export class ApiKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 256, unique: true })
  apikey: string;

  @ManyToOne(() => User, (user) => user.apikeys)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "timestamp", nullable: true })
  expires_at?: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  @BeforeInsert()
  generateApiKey() {
    this.apikey = generateSecret(32);
  }
}
