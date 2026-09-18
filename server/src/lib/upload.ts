import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Prisma cuids are plain lowercase alphanumeric strings — rejecting anything
// else here (before it ever reaches path.join) closes off path traversal via
// a crafted :id segment (e.g. "..%2f..%2f...").
const SAFE_ID_PATTERN = /^[a-z0-9]+$/i;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const orderId = req.params.id;
    if (!SAFE_ID_PATTERN.test(orderId)) {
      cb(new Error('Identificador de orden inválido.'), '');
      return;
    }
    const dir = path.join(UPLOAD_ROOT, 'orders', orderId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, WEBP, GIF).'));
  }
}

export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
});

// Store product images have no user-controlled id segment in their path —
// they all land in one flat directory with a random generated filename.
const storeImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, 'store');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

export const uploadStoreImage = multer({
  storage: storeImageStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
