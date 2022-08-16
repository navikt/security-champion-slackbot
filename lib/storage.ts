import { Storage } from "@google-cloud/storage";
import config from "../config";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import fs from "fs";

const bucketName = config.GSC_BUCKET_NAME;
const storage = bucketName ? new Storage() : null;
const bucket = storage ? storage.bucket(bucketName) : null;

export async function fileExists(fileName: string) {
  if (!bucket) {
    return fs.existsSync(fileName);
  }
  return (await bucket.file(fileName).exists())[0];
}

export async function getFileContent(fileName: string) {
  if (!bucket) {
    return fs.readFileSync(fileName, { encoding: "utf8" });
  }

  return (await bucket.file(fileName).download())[0];
}

export async function setFileContents(fileName: string, contents: string) {
  if (!bucket) {
    return fs.writeFileSync(fileName, contents, { encoding: "utf8" });
  }

  const buffer = Buffer.from(contents);
  const from = new Readable({
    objectMode: false,
    read() {
      this.push(buffer);
      this.push(null);
    },
  });

  const gcsStream = bucket.file(fileName).createWriteStream({
    resumable: false,
  });

  gcsStream.on("error", (err) => {
    console.error(`Error uploading ${fileName} to GSC:`, err);
  });

  gcsStream.on("finish", () => {
    console.log(`Done uploading ${fileName} to GSC`);
  });

  return await pipeline(from, gcsStream);
}
