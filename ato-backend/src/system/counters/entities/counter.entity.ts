import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('counters')
export class Counter {
    @PrimaryColumn()
    _id: string; // Typically the resource name, keeping _id to match logic but usually this would be key or name

    @Column()
    prefix: string;

    @Column({ default: 0 })
    sequence_value: number;
}
