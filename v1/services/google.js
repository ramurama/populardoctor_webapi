const keys = require('../../config/keys');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  projectId: keys.googleProjectId,
  keyFilename: __dirname + '/../../config/image-store.json'
});

const BUCKET_NAME = keys.googleStorageBuckectName;
const bucket = storage.bucket(BUCKET_NAME);
const LOCAL_FILE_LOCATION = __dirname + '/../../doctor-profile-images/';

module.exports = {
  localFilePath: LOCAL_FILE_LOCATION,

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
            .delete(async () => callback(await uploadFile(fileName)));
        } else {
          callback(await uploadFile(fileName));
        }
      })
      .catch(err => {
        return err;
      });
  },

  deleteFile(filename, callback) {
    bucket
      .file(filename)
      .delete()
      .then(data => {
        callback(true);
      })
      .catch(err => {
        console.log(err);
      });
  }
};

function uploadFile(fileName) {
  return new Promise((resolve, reject) => {
    let localFileLocation = LOCAL_FILE_LOCATION + '/' + fileName;
    bucket
      .upload(localFileLocation, { public: true })
      .then(file => {
        // file saved
        console.log('***** uploading new image');
        resolve(getPublicUrl(fileName));
      })
      .catch(err => {
        console.error(err);
        reject(err);
      });
  });
}

// get public url for file
function getPublicUrl(fileName) {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
}
