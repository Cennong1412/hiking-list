// photos/<카테고리>/ 안의 원본 사진을 스캔해 썸네일(photos/thumbs/<카테고리>/)을 생성하고
// photos/manifest.json을 갱신합니다.
// 사용법: npm run build-photos  (최초 1회 npm install 필요)
const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'photos');
const THUMBS_DIR = path.join(PHOTOS_DIR, 'thumbs');
const MANIFEST_PATH = path.join(PHOTOS_DIR, 'manifest.json');

const CATEGORIES = ['인물', '풍경', '여행', '스트리트', '음식', '반려동물', '야경', '이벤트', '건축', '스포츠', '셀프사진'];

const THUMB_MAX_W = 800;
const THUMB_QUALITY = 78;
const EXT_RE = /\.(jpe?g|png)$/i;

async function ensureThumb(category, file) {
  const srcPath = path.join(PHOTOS_DIR, category, file);
  const thumbDir = path.join(THUMBS_DIR, category);
  const thumbPath = path.join(thumbDir, file);
  fs.mkdirSync(thumbDir, { recursive: true });

  const srcStat = fs.statSync(srcPath);
  let needsBuild = true;
  if (fs.existsSync(thumbPath)) {
    needsBuild = srcStat.mtimeMs > fs.statSync(thumbPath).mtimeMs;
  }

  let width, height;
  if (needsBuild) {
    const img = await Jimp.read(srcPath);
    if (img.bitmap.width > THUMB_MAX_W) img.resize({ w: THUMB_MAX_W });
    await img.write(thumbPath, { quality: THUMB_QUALITY });
    width = img.bitmap.width;
    height = img.bitmap.height;
    console.log(`썸네일 생성: ${category}/${file}`);
  } else {
    const img = await Jimp.read(thumbPath);
    width = img.bitmap.width;
    height = img.bitmap.height;
  }
  return { width, height, mtime: srcStat.mtimeMs };
}

async function run() {
  const photos = [];
  for (const category of CATEGORIES) {
    const dir = path.join(PHOTOS_DIR, category);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => EXT_RE.test(f));
    for (const file of files) {
      const { width, height, mtime } = await ensureThumb(category, file);
      photos.push({
        category,
        file: `${category}/${file}`,
        thumb: `thumbs/${category}/${file}`,
        width,
        height,
        mtime
      });
    }
  }
  photos.sort((a, b) => b.mtime - a.mtime);

  const manifest = {
    generatedAt: new Date().toISOString(),
    categories: CATEGORIES,
    photos
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n완료: 총 ${photos.length}장 (photos/manifest.json 갱신)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
