import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';
import { Stream } from './stream.entity';
import { User } from './user.entity'; // <-- Import User entity

@Module({
  imports: [
    ConfigModule,
    // MODIFIED: Include User in forFeature
    TypeOrmModule.forFeature([Stream, User]) 
  ],
  controllers: [StreamController],
  providers: [StreamService],
  exports: [StreamService]
})
export class StreamModule {}