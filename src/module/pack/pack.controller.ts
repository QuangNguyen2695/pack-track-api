import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreatePackDto } from './dto/create-pack.dto';
import { UpdatePackDto } from './dto/update-pack.dto';
import { SearchPackQuery, SearchPackRes } from './dto/query-pack.dto';
import { PackService } from './pack.service';
import { Roles } from '@/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-objectId.pipe';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { UserTokenDto } from '@/jwt/dto/user-token.dto';

@Controller('pack-recordings')
// @UseGuards(JwtAuthGuard) // khuyến nghị
export class PackController {
  constructor(private readonly packService: PackService) {}

  @Post('')
  async create(@Body() dto: CreatePackDto) {
    const data = await this.packService.create(dto);
    return { data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePackDto) {
    const data = await this.packService.update(id, dto);
    return { data };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.packService.findById(id);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.packService.softDelete(id);
  }

  @Patch(':id/mark-uploaded')
  async markUploaded(
    @Param('id') id: string,
    @Body() body: { videoStorageKey?: string; videoFileSize?: number; videoChecksum?: string },
  ) {
    return { data: await this.packService.markUploaded(id, body) };
  }

  @Patch(':id/mark-verified')
  async markVerified(@Param('id') id: string) {
    return { data: await this.packService.markVerified(id) };
  }

  @Post('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  search(@Body(ParseObjectIdPipe) query: SearchPackQuery, @CurrentUser() user: UserTokenDto): Promise<SearchPackRes> {
    const userId = user._id;
    const {
      pageIdx = 0,
      pageSize = 0,
      keyword = '',
      sortBy = {
        key: 'createdAt',
        value: 'desc',
      },
      filters = [],
    } = query;
    return this.packService.search(+pageIdx, +pageSize, keyword, sortBy, filters, userId);
  }
}
