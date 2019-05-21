const keys = require('../../config/keys');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  projectId: keys.googleProjectId,
  keyFilename: __dirname + '/../../config/image-store.json'
});

const BUCKET_NAME = keys.googleStorageBuckectName;
const bucket = storage.bucket(BUCKET_NAME);

module.exports = {
  uploadNewFile(fileName, callback) {
    const file = bucket.file(fileName);
    console.log(fileName);
    file
      .exists()
      .then(async exists => {
        if (exists[0]) {
          //file exists
          console.log('File already exists');
          await bucket
            .file(fileName)
            .delete(async () =>
              callback(await uploadFile(__dirname, fileName))
            );
        } else {
          callback(await uploadFile(__dirname, fileName));
        }
      })
      .catch(err => {
        return err;
      });
  }
};

function uploadFile(location, fileName) {
  return new Promise((resolve, reject) => {
    let localFileLocation = location + '/' + fileName;
    bucket
      .upload(localFileLocation, { public: true })
      .then(file => {
        // file saved
        console.log('***** uploading new image');
        resolve(getPublicThumbnailUrlForItem(fileName));
      })
      .catch(err => {
        console.error(err);
        reject(err);
      });
  });
}

// get public url for file
function getPublicThumbnailUrlForItem(fileName) {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
}
