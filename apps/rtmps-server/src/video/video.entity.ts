import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../stream/user.entity';

export enum VideoStatus {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  streamKey!: string;

  @Column()
  hlsUrl!: string;

  @Column()
  thumbnailUrl!: string;

  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.PRIVATE, // <-- Every new video defaults to private
  })
  status!: VideoStatus;

  @Column({ name: 'uploader_id', nullable: true })
  uploaderId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploader_id' })
  uploader?: User;

  @CreateDateColumn()
  createdAt!: Date;
}