import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// O nome deste arquivo é exigido pelo Prisma; as pastas abaixo (em português) são apontadas aqui.
export default defineConfig({
  schema: 'modelagem/modelo.prisma',
  migrations: { path: 'modelagem/migracoes' },
  datasource: { url: env('DATABASE_URL') }
});
