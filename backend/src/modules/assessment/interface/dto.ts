import { submitAttemptRequestSchema, testVariantSchema } from '@dd/shared';
import { z } from 'zod';

export const variantParams = z.object({ variant: testVariantSchema });

export { submitAttemptRequestSchema };
