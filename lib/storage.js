const { Storage } = require("@google-cloud/storage");
const config = require("../config");
const { Readable, pipeline } = require("stream/promises");

const bucketName = config.GSC_BUCKET_NAME;
const storage = new Storage();
const bucket = storage.bucket(bucketName);

async function fileExists(fileName) {
  return await bucket.file(fileName).exists();
}

async function getFileContent(fileName) {
  return (await bucket.file(fileName).download())[0];
}

async function setFileContents(fileName, contents) {
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
