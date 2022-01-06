const storage = require("../lib/storage");

module.exports = async function cmdTestStorage() {
  console.log("Testing storage");
  const fileName = "slack-users.json";
  const exists = await storage.fileExists(fileName);

  if (exists) {
    console.log("File already exists in storage");
    try {
      const content = await storage.getFileContent(fileName);
      console.log("Content in storage: " + content);
    } catch (e) {
      console.error("Error getting file content", e);
    }
  }
  console.log("Uploading file: " + fileName);
  await storage.setFileContents(
    fileName,
    JSON.stringify({ users: ["julian"] })
  );
  console.log("File uploaded: " + fileName);
};
