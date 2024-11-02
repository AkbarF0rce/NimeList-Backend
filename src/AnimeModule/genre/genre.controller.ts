import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { GenreService } from './genre.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Controller('genre')
export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  @Post('post')
  async create(@Body() createGenreDto: CreateGenreDto) {
    return await this.genreService.createGenre(createGenreDto);
  }

  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    return await this.genreService.deleteGenre(id);
  }

  @Get('get/:id')
  async getOneGenre(@Param('id') id: string) {
    return await this.genreService.getById(id);
  }

  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateGenreDto: CreateGenreDto,
  ) {
    return await this.genreService.updateGenre(id, updateGenreDto);
  }

  @Get('get-all')
  async getAllGenre(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string,
  ) {
    return await this.genreService.getAllGenre(page, limit, search);
  }
}