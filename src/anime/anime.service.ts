import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Repository } from 'typeorm';
import { Anime } from './entities/anime.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { PhotoAnime } from 'src/photo_anime/entities/photo_anime.entity';
import { CreateAnimeDto } from './dto/create-anime.dto';
import { In } from 'typeorm';
import path, { join } from 'path';
import { unlink } from 'fs/promises';
import { Topic } from 'src/topic/entities/topic.entity';
import { v4 } from 'uuid';
import { FavoriteAnime } from 'src/favorite_anime/entities/favorite_anime.entity';
import { Review } from 'src/review/entities/review.entity';
import { UpdateAnimeDto } from './dto/update-anime.dto';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { min } from 'class-validator';

@Injectable()
export class AnimeService {
  constructor(
    @InjectRepository(Anime)
    private animeRepository: Repository<Anime>,
    @InjectRepository(Genre)
    private genreRepository: Repository<Genre>,
    @InjectRepository(PhotoAnime)
    private photoRepository: Repository<PhotoAnime>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
    @InjectRepository(FavoriteAnime)
    private favoriteAnimeRepository: Repository<FavoriteAnime>,
  ) {}

  async createAnime(
    createAnimeDto: CreateAnimeDto,
    files: Express.Multer.File[],
    photo_cover: Express.Multer.File,
  ) {
    const {
      title,
      synopsis,
      release_date,
      genres,
      trailer_link,
      type,
      episodes,
      watch_link,
    } = createAnimeDto;

    // Cari genre berdasarkan ID
    const genreEntities = await this.genreRepository.find({
      where: {
        id: In(genres),
      },
    });

    const anime = this.animeRepository.create({
      title,
      synopsis,
      release_date,
      trailer_link,
      episodes,
      type,
      watch_link,
      photo_cover: photo_cover.path,
      genres: genreEntities,
    });
    await this.animeRepository.save(anime);

    // Save photos if available
    if (files && files.length > 0) {
      for (const file of files) {
        const photo = this.photoRepository.create({
          file_path: file.path, // Adjust if using a different storage strategy
          anime,
        });
        await this.photoRepository.save(photo);
      }
    }

    return {
      status: 201,
      message: 'data created',
    };
  }

  // Fungsi untuk Menghitung hash SHA-256 dari isi file
  private calculateFileHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';

    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);

    return hashSum.digest('hex');
  }

  async updateAnime(
    animeId: string,
    updateAnimeDto: UpdateAnimeDto, // Data anime yang ingin diupdate
    genres: [], // ID genre baru yang ingin dihubungkan dengan anime ini
    photo_anime: Express.Multer.File[],
    photo_cover: Express.Multer.File, // File cover baru yang di-upload
    existing_photos: string[],
  ) {
    // Cari anime berdasarkan ID
    const anime = await this.animeRepository.findOne({
      where: { id: animeId },
      relations: ['genres', 'photos'], // Ambil relasi genre dan photo saat ini
    });

    if (!anime) {
      throw new NotFoundException('Anime tidak ditemukan');
    }

    if (photo_cover) {
      const fileHash = this.calculateFileHash(photo_cover.path);
      const existingHash = this.calculateFileHash(anime.photo_cover);

      if (existingHash !== fileHash) {
        // Hapus file cover lama di sistem
        const Path = join(process.cwd(), anime.photo_cover);
        try {
          await unlink(Path); // Hapus file cover lama dari sistem
        } catch (err) {
          console.error('Error hapus data file foto: ', err);
        }

        // Ubah path cover dengan path yang baru
        anime.photo_cover = photo_cover.path;
        console.log(photo_cover.path);
      } else {
        fs.unlinkSync(photo_cover.path);
      }
    }

    // Update informasi dasar anime
    Object.assign(anime, updateAnimeDto);

    const genreEntities = await this.genreRepository.find({
      where: { id: In(genres) },
    });

    if (genreEntities.length !== genres.length) {
      throw new NotFoundException('Satu atau lebih genre tidak ditemukan');
    }

    // Update genre
    anime.genres = genreEntities;
    // Save anime
    const save = await this.animeRepository.save(anime);

    if (save) {
      // Identifikasi dan hapus foto lama yang tidak ada di file baru
      for (const photo of anime.photos) {
        const oldFilePath = join(process.cwd(), photo.file_path);

        // Cek apakah existing_photos memberikan path yang tidak ada di dalam sistem
        if (!existing_photos.includes(photo.file_path)) {
          try {
            await unlink(oldFilePath); // Hapus file lama dari sistem
          } catch (err) {
            console.error('Error deleting old photo file:', err);
          }
          await this.photoRepository.remove(photo); // Hapus data foto lama dari database
        }
      }

      if (photo_anime && photo_anime.length > 0) {
        // Simpan path dan file foto baru yang belum ada di database
        const newPhotos = photo_anime
          .filter((file) => !existing_photos.includes(file.path)) // Hanya simpan file dan path baru yang belum ada di database
          .map(async (file) => {
            const photo = this.photoRepository.create({
              file_path: file.path,
              anime,
            });
            await this.photoRepository.save(photo);
          });
      }
    }
  }

  async getAnimeById(animeId: string) {
    // Cari anime berdasarkan id
    const anime = await this.animeRepository.findOne({
      where: { id: animeId },
      relations: ['genres', 'photos', 'review', 'topic'],
    });

    if (!anime) {
      throw new NotFoundException('Anime tidak ditemukan');
    }

    // Hitung total review dari id anime
    const reviewCount = await this.reviewRepository
      .createQueryBuilder('review')
      .where('review.id_anime = :animeId', { animeId })
      .getCount();

    // Hitung average rating dari id anime
    const getAvgRating = await this.reviewRepository
      .createQueryBuilder('review')
      .where('review.id_anime = :animeId', { animeId })
      .select('AVG(review.rating)', 'ratingAvg')
      .getRawOne();

    // Format rata-rata rating dengan dua angka di belakang koma
    const avgRating = parseFloat(getAvgRating.ratingAvg).toFixed(1);

    // Hitung total topic dari id anime
    const topicCount = await this.topicRepository
      .createQueryBuilder('topic')
      .where('topic.id_anime = :animeId', { animeId })
      .getCount();

    const totalFav = await this.favoriteAnimeRepository
      .createQueryBuilder('fav')
      .where('fav.id_anime = :animeId', { animeId })
      .getCount();

    return {
      anime,
      reviewCount,
      averageRating: parseFloat(avgRating) || 0, // Set 0 jika tidak ada rating
      topicCount,
      totalFav,
    };
  }

  async deleteAnime(animeId: string) {
    // Hapus anime dari database berdasarkan id yang diberikan
    const deleted = await this.animeRepository.softDelete({ id: animeId });
    const photoDeleted = await this.photoRepository.softDelete({
      id_anime: animeId,
    });
  }

  async getAllAnimeAdmin(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    order: 'ASC' | 'DESC' = 'ASC',
  ) {
    // Ambil semua data anime dan relasi review
    const [animes, total] = await this.animeRepository.findAndCount({
      relations: ['review'],
      where: {
        title: ILike(`%${search}%`),
      },
      order: {
        title: order,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Hitung rata-rata rating untuk setiap anime
    const data = animes.map((anime) => {
      // Menghitung rata-rata rating jika anime memiliki review
      const avgRating =
        anime.review.length > 0
          ? anime.review.reduce(
              (total, review) => total + Number(review.rating),
              0,
            ) / anime.review.length
          : 0;

      return {
        id: anime.id,
        title: anime.title,
        created_at: anime.created_at,
        updated_at: anime.updated_at,
        avg_rating: avgRating.toFixed(1), // Format ke 1 desimal
      };
    });

    return {
      data,
      total,
    };
  }

  async getAnimeNewest() {
    const animes = await this.animeRepository.find({
      order: { release_date: 'DESC' },
      relations: ['genres'],
      select: [
        'id',
        'title',
        'type',
        'photo_cover',
        'release_date',
        'synopsis',
        'trailer_link',
      ],
    });

    return { data: animes };
  }

  async getAnimeByGenre(genreId: number) {
    const animes = await this.animeRepository
      .createQueryBuilder('anime')
      .leftJoin('anime.review', 'review') // Join table review
      .leftJoin('anime.genres', 'genre') // Join table genre
      .addSelect('COALESCE(AVG(review.rating), 0)', 'averageRating')
      .where('genre.id = :genreId', { genreId }) // Menyaring anime berdasarkan id genre
      .groupBy('anime.id')
      .getRawMany();

    // Jika tidak ada anime yang mengandung genre yang dipilih
    if (animes.length === 0) {
      throw new NotFoundException(
        'Anime yang mengandung genre ini tidak ditemukan',
      );
    }

    // Tampilkan anime yang ada
    return animes.map((anime) => ({
      ...anime,
      averageRating: parseFloat(anime.averageRating).toFixed(1),
    }));
  }

  async getAnimeRecommended() {
    const animes = await this.animeRepository
      .createQueryBuilder('anime')
      .leftJoin('anime.review', 'review')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'avgRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .groupBy('anime.id')
      // .having('AVG(review.rating) > :minRating', { minRating: 4 })
      .having('COUNT(review.id) > :minReviews', { minReviews: 3 })
      .take(8)
      .getRawMany();

    if (animes.length === 0) {
      throw new NotFoundException(
        'Anime yang direkomendasikan tidak ditemukan',
      );
    }

    return animes.map((anime) => ({
      id: anime.anime_id,
      title: anime.anime_title,
      type: anime.anime_type,
      photo_cover: anime.anime_photo_cover,
      avgRating: parseFloat(anime.avgRating).toFixed(1),
    }));
  }

  async getMostPopular() {
    // Langkah 1: Hitung rata-rata rating dari semua anime (C)
    const allAnimes = await this.animeRepository.find({
      relations: ['review'],
    });

    const totalRatings = allAnimes.reduce((sum, anime) => {
      const animeTotalRating = anime.review.reduce(
        (total, review) => total + Number(review.rating),
        0,
      );
      return sum + animeTotalRating;
    }, 0);

    const totalReviews = allAnimes.reduce(
      (sum, anime) => sum + anime.review.length,
      0,
    );

    const avgRatingAllAnime = totalRatings / totalReviews; // Rata-rata rating semua anime

    // Langkah 2: Tentukan jumlah minimum review (m)
    const minReviews = 1; // Misalnya hanya anime dengan setidaknya 50 review yang masuk peringkat

    // Langkah 3: Hitung Weighted Rating (WR) untuk setiap anime
    const data = allAnimes
      .map((anime) => {
        const totalReviewAllAnime = anime.review.length;
        const avgRatingAnime =
          totalReviewAllAnime > 0
            ? anime.review.reduce(
                (total, review) => total + Number(review.rating),
                0,
              ) / totalReviewAllAnime
            : 0;

        // Hanya hitung weighted rating untuk anime dengan jumlah review >= m
        if (totalReviewAllAnime >= minReviews) {
          const weightedRating =
            (totalReviewAllAnime / (totalReviewAllAnime + minReviews)) *
              avgRatingAnime +
            (minReviews / (totalReviewAllAnime + minReviews)) *
              avgRatingAllAnime;
          return {
            id: anime.id,
            title: anime.title,
            type: anime.type,
            photo_cover: anime.photo_cover,
            avg_rating: avgRatingAnime.toFixed(1), // Rata-rata rating biasa
            weighted_rating: weightedRating.toFixed(1), // Weighted Rating (WR)
          };
        }

        return null; // Tidak memenuhi syarat
      })
      .filter((anime) => anime !== null) // Hapus anime yang tidak memenuhi syarat
      .sort(
        (a, b) => parseFloat(b.weighted_rating) - parseFloat(a.weighted_rating),
      ); // Urutkan berdasarkan WR

    // Langkah 4: Tampilkan anime dengan WR tertinggi sebagai "Anime All Time"
    return data;
  }

  async getAllGenre() {
    return await this.genreRepository.find();
  }
}
