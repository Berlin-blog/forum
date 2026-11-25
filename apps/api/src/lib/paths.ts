import { fileURLToPath } from 'node:url';

export const uploadsDir = fileURLToPath(new URL('../../../../uploads/', import.meta.url));
