const { Storage } = require("@google-cloud/storage");
const config = require("../config");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const fs = require("fs");

const bucketName = config.GSC_BUCKET_NAME;
const storage = bucketName ? new Storage() : null;
const bucket = storage ? storage.bucket(bucketName) : null;

async function fileExists(fileName) {
  if (!bucket) {
    return fs.existsSync(fileName);
  }
  return (await bucket.file(fileName).exists())[0];
}

async function getFileContent(fileName) {
  if (!bucket) {
    return fs.readFileSync(fileName, { encoding: "utf8" });
  }

  return (await bucket.file(fileName).download())[0];
}

async function setFileContents(fileName, contents) {
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

module.exports = {
  fileExists,
  getFileContent,
  setFileContents,
};
