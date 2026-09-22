import ImageKit from '@imagekit/nodejs';

export const imagekit = new ImageKit({
  privateKey: process.env['IMAGEKIT_PRIVATE_KEY'], // default, can be omitted if env var is set
});

export const url = imagekit.helper.buildSrc({
  urlEndpoint: 'https://ik.imagekit.io/iamfakerupam',
  src: '/path/to/image.jpg',
});