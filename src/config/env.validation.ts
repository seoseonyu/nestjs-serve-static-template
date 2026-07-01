import { z } from 'zod';

/**
 * 프로세스 환경변수 스키마. 부팅 시 검증해 잘못된 설정이면 즉시 실패(fail-fast)한다.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
