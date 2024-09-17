import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Dream } from "./Dream.entity";
import { Playlist } from "./Playlist.entity";
import { Role } from "./Role.entity";
import { Vote } from "./Vote.entity";
import { Invite } from "./Invite.entity";
import { NEW_USER_DEFAULT_QUOTA } from "constants/user.constants";
import { ApiKey } from "./ApiKey.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: true, type: "varchar", length: 64 })
  workOSId: string | null;

  @Column({ nullable: true, type: "varchar" })
  cognitoId: string | null;

  @Column({ type: "varchar" })
  email: string;

  @Column({ nullable: true, type: "varchar", length: 50 })
  name?: string | null;

  @Column({ nullable: true, type: "varchar" })
  lastName?: string | null;

  @Column({ nullable: true, type: "varchar" })
  description?: string | null;

  @Column({ nullable: true, type: "varchar" })
  avatar?: string | null;

  @OneToMany(() => Dream, (dream) => dream.user)
  dreams: Dream[];

  @OneToMany(() => ApiKey, (apikey) => apikey.user)
  apikeys: ApiKey[];

  @OneToMany(() => Vote, (vote) => vote.user, {
    cascade: ["soft-remove"],
  })
  votes: Vote[];

  @OneToMany(() => Playlist, (playlist) => playlist.user)
  playlists: Playlist[];

  /**
   *  Role
   */
  @ManyToOne(() => Role)
  @JoinColumn()
  role: Role;

  /**
   * current dream
   */
  @ManyToOne(() => Dream, { nullable: true })
  @JoinColumn()
  currentDream?: Dream | null;

  /**
   * current playlist
   */
  @ManyToOne(() => Playlist, { nullable: true })
  @JoinColumn()
  currentPlaylist?: Playlist | null;

  /**
   * nsfw flag
   */
  @Column({
    type: "boolean",
    default: false,
  })
  nsfw: boolean;

  /**
   * enable marketing emails flag
   */
  @Column({
    type: "boolean",
    default: true,
  })
  enableMarketingEmails: boolean;

  /**
   * signup invite
   */
  @ManyToOne(() => Invite, { nullable: true })
  @JoinColumn()
  signupInvite?: Invite | null;

  /**
   * Processed video size on bytes
   */
  @Column({ type: "bigint", default: 0 })
  quota?: number;

  /**
   * last_login_at saves the last login user date
   * users with null last_login_at are considered unverified (have never logged in)
   */
  @Column({ nullable: true, type: "timestamp" })
  last_login_at: Date;

  /**
   * last_client_ping_at saves the client ping sent
   * users with null last_client_ping_at are those doesn't have used client
   */
  @Column({ nullable: true, type: "timestamp" })
  last_client_ping_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @BeforeInsert()
  setQuota() {
    this.quota = NEW_USER_DEFAULT_QUOTA;
  }
}
