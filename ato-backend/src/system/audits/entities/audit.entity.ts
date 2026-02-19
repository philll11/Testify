import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export interface AuditChange {
    field: string;
    oldValue: any;
    newValue: any;
}

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    REOPEN = 'REOPEN',
}

@Entity('audit_entries')
export class AuditEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    resource: string;

    @Column()
    resourceId: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action: AuditAction;

    @Column({ type: 'jsonb', default: [] })
    changes: AuditChange[];

    @Column()
    userId: string;

    @Column()
    reason: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;

    @CreateDateColumn()
    date: Date;
}
