import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FavoriteAnimeService } from './favorite_anime.service';
import { CreateFavoriteAnimeDto } from './dto/create-favorite_anime.dto';
import { UpdateFavoriteAnimeDto } from './dto/update-favorite_anime.dto';
import { JwtAuthGuard } from 'src/AuthModule/auth/guards/jwt-auth.guard';

@Controller('favorite-anime')
export class FavoriteAnimeController {
  constructor(private readonly favoriteAnimeService: FavoriteAnimeService) {}

  @Post('post')
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() data: CreateFavoriteAnimeDto) {
    data.id_user = req.user.userId;
    return this.favoriteAnimeService.createFav(data);
  }

  @Put('restore/:id')
  async restore(@Param('id') id: string) {
    return this.favoriteAnimeService.restoreFav(id);
  }

  @Delete('delete/:id_anime')
  @UseGuards(JwtAuthGuard)
  async delete(@Request() req, @Param('id_anime') id_anime: string) {
    return this.favoriteAnimeService.deleteFav(req.user.userId, id_anime);
  }

  @Get('user-favorites')
  @UseGuards(JwtAuthGuard)
  async userFavorites(@Request() req) {
    return this.favoriteAnimeService.userFavorites(req.user.userId);
  }

  @Get('by-user-and-anime/:id_anime')
  @UseGuards(JwtAuthGuard)
  async byUserAndAnime(@Request() req, @Param('id_anime') id_anime: string) {
    return this.favoriteAnimeService.byUserAndAnime(req.user.userId, id_anime);
  }
}
