import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/UserModule/role/entities/role.entity';
import { LikeComment } from 'src/TopicModule/like_comment/entities/like_comment.entity';
import { LikeTopic } from 'src/TopicModule/like_topic/entities/like_topic.entity';
import { Topic } from 'src/TopicModule/topic/entities/topic.entity';
import { Review } from 'src/AnimeModule/review/entities/review.entity';
import { FavoriteAnime } from 'src/AnimeModule/favorite_anime/entities/favorite_anime.entity';
import { Transaction } from 'src/TransactionModule/transaction/entities/transaction.entity';
import { AuthModule } from '../../AuthModule/auth/auth.module';
import { PhotoProfileModule } from '../photo_profile/photo_profile.module';
import { JwtModule } from '@nestjs/jwt';
import { TopicModule } from 'src/TopicModule/topic/topic.module';
import { ReviewModule } from 'src/AnimeModule/review/review.module';
import { FavoriteAnimeModule } from 'src/AnimeModule/favorite_anime/favorite_anime.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [
    TypeOrmModule.forFeature([
      User,
      LikeComment,
      LikeTopic,
      Topic,
      Review,
      FavoriteAnime,
      Role,
      Transaction,
    ]),
    PhotoProfileModule,
    JwtModule,
    // TopicModule,
    // ReviewModule,
    // FavoriteAnimeModule,
  ],
  exports: [UserService],
})
export class UserModule {}
