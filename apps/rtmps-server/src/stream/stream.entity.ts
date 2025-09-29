import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('streams') // Changed from 'Stream' to 'streams' for consistency
export class Stream {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  streamKey!: string;

  @Column()
  streamUrl!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.streams)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ default: false })
  isActive!: boolean;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  // Fixed: Changed from 'datetime' to 'timestamp' for PostgreSQL compatibility
  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  lastActiveAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}