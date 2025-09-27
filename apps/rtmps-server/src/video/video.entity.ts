import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  createdAt!: Date;
}