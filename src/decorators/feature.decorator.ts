// src/common/decorators/feature.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const FEATURE_META_KEY = 'feature_meta';
export const Feature = (moduleKey: string, functionKey: string) =>
  SetMetadata(FEATURE_META_KEY, { moduleKey, functionKey });
