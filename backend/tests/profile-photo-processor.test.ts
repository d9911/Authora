/// <reference types="node" />

import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ProfileImageProcessor } from '../src/modules/profile-photo/services/ProfileImageProcessor';

async function makeImage(width: number, height: number, format: 'jpeg' | 'png' | 'webp') {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 90, g: 80, b: 220 },
    },
  });
  if (format === 'jpeg') return image.jpeg().toBuffer();
  if (format === 'png') return image.png().toBuffer();
  return image.webp().toBuffer();
}

async function assertRejectsMessage(
  action: () => Promise<unknown>,
  expectedMessage: RegExp,
) {
  await assert.rejects(action, expectedMessage);
}

async function run() {
  const processor = new ProfileImageProcessor();

  const avatar = await processor.process({
    kind: 'avatar',
    data: await makeImage(800, 600, 'png'),
    mimeType: 'image/png',
  });
  assert.equal(avatar.width, 512);
  assert.equal(avatar.height, 512);
  assert.equal(avatar.contentType, 'image/webp');
  assert.equal(avatar.sizeBytes, avatar.data.length);
  assert.match(avatar.etag, /^[a-f0-9]{64}$/);

  const cover = await processor.process({
    kind: 'cover',
    data: await makeImage(1200, 1200, 'jpeg'),
    mimeType: 'image/jpeg',
  });
  assert.equal(cover.width, 1920);
  assert.equal(cover.height, 640);
  assert.equal(cover.contentType, 'image/webp');

  const webpAvatar = await processor.process({
    kind: 'avatar',
    data: await makeImage(320, 320, 'webp'),
    mimeType: 'image/webp',
  });
  assert.equal(webpAvatar.width, 512);
  assert.equal(webpAvatar.height, 512);

  await assertRejectsMessage(
    () =>
      processor.process({
        kind: 'avatar',
        data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        mimeType: 'image/svg+xml',
      }),
    /Only JPEG, PNG, and WebP images are allowed/,
  );

  await assertRejectsMessage(
    () =>
      processor.process({
        kind: 'avatar',
        data: Buffer.alloc(10 * 1024 * 1024 + 1),
        mimeType: 'image/png',
      }),
    /Avatar image must be 10 MB or smaller/,
  );
}

run()
  .then(() => {
    console.log('profile-photo-processor tests passed');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
