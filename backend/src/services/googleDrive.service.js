const { google } = require('googleapis');
const stream = require('stream');

let driveClient = null;

function getDrive() {
  if (driveClient) return driveClient;

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

// Create folder if it doesn't exist, return folderId
async function ensureFolder(name, parentId) {
  const drive = getDrive();
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive' });
  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  });
  return folder.data.id;
}

// Get or create the GD task folder: ROOT/ANK AMS/GD/<clientName>/<taskId>/
async function getTaskFolder(clientName, taskId) {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootId) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID not set');

  const ankAmsId  = await ensureFolder('ANK AMS', rootId);
  const gdRootId  = await ensureFolder('GD', ankAmsId);
  const clientId  = await ensureFolder(clientName.replace(/[/\\?%*:|"<>]/g, '_'), gdRootId);
  const taskFolderId = await ensureFolder(String(taskId), clientId);
  return taskFolderId;
}

// Upload a file buffer to Drive, return { fileId, webViewLink, thumbnailLink }
async function uploadFile({ buffer, mimeType, fileName, folderId }) {
  const drive = getDrive();
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: bufferStream },
    fields: 'id,webViewLink,thumbnailLink,name,size',
  });

  // Make publicly viewable (read-only)
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    fileId:        res.data.id,
    webViewLink:   res.data.webViewLink,
    thumbnailLink: res.data.thumbnailLink,
    name:          res.data.name,
    size:          res.data.size,
  };
}

async function deleteFile(fileId) {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

module.exports = { getTaskFolder, uploadFile, deleteFile };
