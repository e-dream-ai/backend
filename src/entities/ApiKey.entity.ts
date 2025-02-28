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
/**
 * index for 'hash' column (stores sha256 hashed api key)
 */
@Index("IDX_HASH", ["hash"])
export class ApiKey {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * encrypted api key value
   */
  @Column({ type: "varchar" })
  apikey: string;

  /**
   * hashed sha256 api key
   * it helps to validate api key existence faster on db
   */
  @Column({ type: "varchar" })
  hash: string;

  /**
   * initialization vector (iv) to encrypt/decrypt api key
   */
  @Column({ type: "varchar" })
  iv: string;

  @ManyToOne(() => User, (user) => user.apikeys)
  @JoinColumn()
  @Index()
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
  /**
   * Generates, encrypts and hashes apikey to store on database
   */
  generateApiKey() {
    const apikey = uuidv4();
    const { iv, content } = encrypt(apikey);
    this.apikey = content;
    this.iv = iv;
    this.hash = hashApiKey(apikey);
  }
}
