import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Dream } from "./Dream.entity";
import { Playlist } from "./Playlist.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cognitoId: string;

  @Column()
  email: string;

  @OneToMany(() => Dream, (dream) => dream.user)
  dreams: Dream[];

  @OneToMany(() => Playlist, (playlist) => playlist.user)
  playlists: Playlist[];
}
