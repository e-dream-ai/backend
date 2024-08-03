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
import { encrypt, hashApiKey } from "utils/crypto.util";
import { User } from "./User.entity";
import { v4 as uuidv4 } from "uuid";

@Entity()
// create an index on the 'hash' column
@Index("IDX_HASH", ["hash"])
export class ApiKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  apikey: string;

  @Column({ type: "varchar" })
  hash: string;

  @Column({ type: "varchar" })
  iv: string;

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
    const apikey = uuidv4();
    const { iv, content } = encrypt(apikey);
    this.apikey = content;
    this.iv = iv;
    this.hash = hashApiKey(apikey);
  }
}
