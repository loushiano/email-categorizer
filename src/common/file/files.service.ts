import { Injectable, Logger, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import * as sharp from 'sharp';

import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private s3: S3;
  private logger = new Logger(FilesService.name);
  constructor(private configService: ConfigService) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('ACCESS_KEY'),
      secretAccessKey: this.configService.get('AWS_SECRET_KEY'),
      region: 'ca-central-1',
    });
  }

  async getImage(res, name: string) {
    try {
      var options = {
        Bucket: 'halal-buket',
        Key: `images/${name}`,
      };

      var fileStream = this.s3
        .getObject(options)
        .createReadStream()
        .on('error', (error) => {
          res.status(500).json(`Failed to get image file: ${error.message}`);
        });
      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json(`Failed to get image file: ${error.message}`);
    }
  }

  async getEmail(name: string): Promise<string> {
    try {
      var options = {
        Bucket: 'halal-buket',
        Key: `emails/${name}.html`,
      };
      this.logger.log('getting email');
      var fileStream = await this.s3.getObject(options).createReadStream();
      const chunks = [];
      await new Promise((resolve, reject) => {
        fileStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        fileStream.on('error', (err) => reject(err));
        fileStream.on('end', () =>
          resolve(Buffer.concat(chunks).toString('utf8')),
        );
      });
      return chunks.join('');
    } catch (error) {
      this.logger.error('error getting email', error);
      return '<h1>hi</h1>';
    }
  }

  uploadToAWS(props) {
    return new Promise((resolve, reject) => {
      this.s3.upload(props, (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
    });
  }
  async sharpify(originalFile, resize: boolean) {
    try {
      const image = sharp(originalFile.buffer);
      const meta = await image.metadata();
      const { format } = meta;

      const newFile = resize
        ? await image[format]({ quality: 80 })
            .resize({
              width: 500,

              fit: 'contain',
            })
            .withMetadata()
        : await await image[format]({ quality: 90 })
            .resize({
              width: 500,

              fit: 'contain',
            })
            .withMetadata();
      const { width, height } = await newFile.metadata();

      return [newFile, width, height];
    } catch (err) {
      throw new Error(err);
    }
  }

  async fileupload(@Res() res, afterUpload: Function, file, folder = 'images') {
    if (file) {
      try {
        const originalFile = file;

        const newFile = (await this.sharpify(originalFile, true))[0];

        let random = uuidv4();
        let newName = `${folder}/${random}_${originalFile.originalname}`;
        await this.uploadToAWS({
          Body: newFile,
          Bucket: 'halal-buket',
          ACL: 'private',
          ContentType: originalFile.mimetype,
          Key: newName,
        });

        return afterUpload(newName)
          .then((a) =>
            res.status(201).json(`${process.env.SERVER_URL}/${newName}`),
          )
          .catch((error) =>
            res.status(500).json(`Failed to run after upload: ${error}`),
          );
      } catch (error) {
        console.log(error);
        return res.status(500).json(`Failed to upload image file: ${error}`);
      }
    } else {
      return res.status(500).json(`Failed to  upload file`);
    }
  }

  async uploadImages(images, folder = 'images', resize = true) {
    let imagesUrls = [];
    let ratios: number[] = [];
    for (let image of images) {
      try {
        const originalFile = image;

        const [newFile, width, height] = await this.sharpify(
          originalFile,
          resize,
        );

        let random = uuidv4();
        let newName = `${folder}/${random}_${originalFile.originalname}`;
        await this.uploadToAWS({
          Body: newFile,
          Bucket: 'halal-buket',
          ACL: 'private',
          ContentType: originalFile.mimetype,
          Key: newName,
        });
        imagesUrls.push(`${this.configService.get('SERVER_URL')}/${newName}`);
        ratios.push(Math.ceil(height / width));
      } catch (error) {
        this.logger.error('Couldnt load image', error);
        throw Error(`Couldnt load image`);
      }
    }

    return { imagesUrls, ratios };
  }
}
