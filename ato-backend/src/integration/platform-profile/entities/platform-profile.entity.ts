import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { IntegrationPlatform } from '../../constants/integration-platform.enum';
import { PlatformEnvironment } from '../../platform-environment/entities/platform-environment.entity';

@Entity('platform_profiles')
export class PlatformProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  accountId: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: IntegrationPlatform,
  })
  platformType: IntegrationPlatform;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @OneToMany(() => PlatformEnvironment, (env) => env.profile)
  environments: PlatformEnvironment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
