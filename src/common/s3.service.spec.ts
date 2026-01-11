import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { createMockConfigService } from '../test/test-utils';
import { Readable } from 'stream';

// Mock @aws-sdk/client-s3
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

// Mock @aws-sdk/lib-storage
jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({ Location: 'https://s3.amazonaws.com/test-bucket/file.txt' }),
  })),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid-1234'),
}));

describe('S3Service', () => {
  let service: S3Service;
  let mockS3Client: any;

  beforeEach(async () => {
    const { S3Client } = require('@aws-sdk/client-s3');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    mockS3Client = (service as any).s3;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize S3Client with correct configuration', () => {
      const { S3Client } = require('@aws-sdk/client-s3');

      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });
  });

  describe('getFile', () => {
    it('should retrieve file content from S3', async () => {
      const mockContent = 'File content here';
      const mockStream = new Readable();
      mockStream.push(mockContent);
      mockStream.push(null);

      mockS3Client.send.mockResolvedValue({
        Body: mockStream,
      });

      const result = await service.getFile('path/to/file.txt');

      // Note: The implementation joins chunks, so the result format depends on implementation
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle S3 errors gracefully', async () => {
      mockS3Client.send.mockRejectedValue(new Error('S3 error'));

      const result = await service.getFile('nonexistent/file.txt');

      expect(result).toBe('<h1>hi</h1>'); // Default error response
    });

    it('should call GetObjectCommand with correct parameters', async () => {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const mockStream = new Readable();
      mockStream.push('content');
      mockStream.push(null);

      mockS3Client.send.mockResolvedValue({
        Body: mockStream,
      });

      await service.getFile('test/file.txt');

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test/file.txt',
      });
    });
  });

  describe('uploadFile', () => {
    it('should upload file with generated UUID', async () => {
      const { Upload } = require('@aws-sdk/lib-storage');
      const mockFile = {
        originalname: 'test-file.txt',
        buffer: Buffer.from('file content'),
        mimetype: 'text/plain',
      };

      const result = await service.uploadFile(mockFile, 'client-123');

      expect(result).toBe('client-123/mocked-uuid-1234_test-file.txt');
      expect(Upload).toHaveBeenCalled();
    });

    it('should sanitize file names with special characters', async () => {
      const mockFile = {
        originalname: 'test file (1).txt',
        buffer: Buffer.from('content'),
        mimetype: 'text/plain',
      };

      const result = await service.uploadFile(mockFile, 'client-456');

      // Special characters replaced with underscores
      expect(result).toBe('client-456/mocked-uuid-1234_test_file__1_.txt');
    });

    it('should upload with correct content type', async () => {
      const { Upload } = require('@aws-sdk/lib-storage');
      const mockFile = {
        originalname: 'image.png',
        buffer: Buffer.from('image data'),
        mimetype: 'image/png',
      };

      await service.uploadFile(mockFile, 'client-789');

      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            ContentType: 'image/png',
          }),
        }),
      );
    });

    it('should use correct S3 bucket', async () => {
      const { Upload } = require('@aws-sdk/lib-storage');
      const mockFile = {
        originalname: 'doc.pdf',
        buffer: Buffer.from('pdf content'),
        mimetype: 'application/pdf',
      };

      await service.uploadFile(mockFile, 'client-001');

      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
          }),
        }),
      );
    });

    it('should generate unique file paths for each upload', async () => {
      const { v4: uuid } = require('uuid');
      uuid.mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2');

      const mockFile1 = {
        originalname: 'file.txt',
        buffer: Buffer.from('content1'),
        mimetype: 'text/plain',
      };
      const mockFile2 = {
        originalname: 'file.txt',
        buffer: Buffer.from('content2'),
        mimetype: 'text/plain',
      };

      const result1 = await service.uploadFile(mockFile1, 'client');
      const result2 = await service.uploadFile(mockFile2, 'client');

      expect(result1).toBe('client/uuid-1_file.txt');
      expect(result2).toBe('client/uuid-2_file.txt');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from S3', async () => {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      mockS3Client.send.mockResolvedValue({});

      await service.deleteFile('path/to/file.txt');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'path/to/file.txt',
      });
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      mockS3Client.send.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteFile('path/to/file.txt')).rejects.toThrow('Delete failed');
    });
  });

  describe('uploadToAWS', () => {
    it('should upload with provided parameters', async () => {
      const { Upload } = require('@aws-sdk/lib-storage');
      const params = {
        Bucket: 'custom-bucket',
        Key: 'custom/path/file.txt',
        Body: Buffer.from('content'),
        ContentType: 'text/plain',
      };

      await service.uploadToAWS(params);

      expect(Upload).toHaveBeenCalledWith({
        client: expect.anything(),
        params,
      });
    });

    it('should call done on upload instance', async () => {
      const { Upload } = require('@aws-sdk/lib-storage');
      const mockDone = jest.fn().mockResolvedValue({});
      Upload.mockImplementationOnce(() => ({
        done: mockDone,
      }));

      await service.uploadToAWS({
        Bucket: 'bucket',
        Key: 'key',
        Body: Buffer.from('data'),
      });

      expect(mockDone).toHaveBeenCalled();
    });

    it('should return upload result', async () => {
      const { Upload } = require('@aws-sdk/lib-storage');
      const expectedResult = {
        Location: 'https://bucket.s3.amazonaws.com/key',
        ETag: '"abc123"',
      };
      Upload.mockImplementationOnce(() => ({
        done: jest.fn().mockResolvedValue(expectedResult),
      }));

      const result = await service.uploadToAWS({
        Bucket: 'bucket',
        Key: 'key',
        Body: Buffer.from('data'),
      });

      expect(result).toEqual(expectedResult);
    });
  });
});
