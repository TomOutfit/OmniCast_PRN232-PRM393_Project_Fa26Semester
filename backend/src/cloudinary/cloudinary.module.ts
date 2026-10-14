// ============================================================
// OmniCast - Cloudinary Module
// ============================================================

import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryUploadController } from './cloudinary-upload.controller';

@Module({
  providers: [CloudinaryService],
  controllers: [CloudinaryUploadController],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
