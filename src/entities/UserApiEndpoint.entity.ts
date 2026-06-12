import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Generated,
} from "typeorm";
import { User } from "./User.entity";
import type {
  EndpointProviderType,
  EndpointCapabilities,
} from "../types/user-api-endpoint.types";

@Entity("user_api_endpoint")
export class UserApiEndpoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "string", unique: true })
  @Generated("uuid")
  @Index()
  uuid: string;

  @Column()
  @Index()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  name: string;

  @Column()
  providerType: EndpointProviderType;

  @Column()
  presetId: string;

  @Column()
  endpointUrl: string;

  @Column()
  apiKeyEncrypted: string;

  @Column()
  apiKeyIv: string;

  @Column({ length: 4 })
  apiKeyLastFour: string;

  @Column()
  modelId: string;

  @Column({ type: "jsonb" })
  capabilities: EndpointCapabilities;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
