declare module "image-size" {
  export interface ImageInfo {
    width?: number;
    height?: number;
    type?: string;
    images?: Array<{ width?: number; height?: number; type?: string }>;
  }

  export interface ImageSizeOptions {
    [key: string]: unknown;
  }

  export default function imageSize(
    input: string | Buffer,
    options?: ImageSizeOptions
  ): ImageInfo;
}
