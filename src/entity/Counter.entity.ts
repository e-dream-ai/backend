import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

export type KeyCounterType = "general-conter";

@Entity("counter")
export class Counter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: "key",
    type: "enum",
    enum: ["general-conter"],
    default: "general-conter",
  })
  key: KeyCounterType;

  @Column()
  value: number;
}
