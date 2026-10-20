import { Inject, Injectable, Logger } from "@nestjs/common";
import { mkdir, readFile, stat, writeFile, access } from "fs/promises";
import { constants } from "fs";
import { join, resolve } from "path";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { randomToken } from "../common/crypto";

/**
 * Private object storage on local disk (mounted volume in Docker). Nothing here
 * is served statically; files leave only through AttachmentsController after
 * an authorisation check. Swap for S3/MinIO by implementing the same methods.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger("StorageService");
  private readonly root: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.root = resolve(config.storageDir);
  }

  async put(data: Buffer, extension: string): Promise<string> {
    const now = new Date();
    const dir = join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
    await mkdir(join(this.root, dir), { recursive: true, mode: 0o750 });
    const key = `${dir}/${randomToken(18)}.${extension}`;
    await writeFile(join(this.root, key), data, { mode: 0o640 });
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root)) throw new Error("Invalid storage key");
    return readFile(path);
  }

  async healthy(): Promise<{ ok: boolean; message: string }> {
    try {
      await mkdir(this.root, { recursive: true });
      await access(this.root, constants.W_OK);
      await stat(this.root);
      return { ok: true, message: "Writable" };
    } catch (err) {
      this.logger.error(`Storage not writable: ${(err as Error).message}`);
      return { ok: false, message: "Storage directory is not writable" };
    }
  }
}

/** Accept only what we expect, judged by content, not by the client's claimed type. */
export function sniffMime(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(0, 5).toString() === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  return null;
}
