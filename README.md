# Dropbox Upload 

This package will let user's upload small, as well as large files to the Dropbox using Dropbox API.

## Features

- Download file to local folder from url
- Get dropbox access token
- Upload file to dropbox

## Installation
Install the package

```sh
npm i react-native-dropbox-upload-zluck
```

## Usage
```sh
import Dropbox from 'react-native-dropbox-upload-zluck';
```

## Download file
Parameters:
| Param | README | Optional
| ------ | ------ | ------ |
| url | Enter file url | required |
| fileName | Enter the name of the file | required |
| openOnDownload | default: false, set it true, if you want to open file when download is completed | optional |
| downloadProgress | Callback which will return download progress | optional |

```sh
const db = new Dropbox();
result = await db.downloadFile(
    fileUrl,
    fileName,
    false,
    (progress: number) => {
        //Use the progress to show progress bar
    }
);
```
Response
```sh
result -> { success: false, path: '' };
```

## View file
Parameters:
| Param | README | Optional
| ------ | ------ | ------ |
| filePath | Enter file path | required |

```sh
const db = new Dropbox();
db.viewFile(filePath);
```

## Get Dropbox token
Parameters:
| Param | README | Optional
| ------ | ------ | ------ |
| oauthClientId | Client Id obtained from dropbox developer console | required |
| oAuthClientSecret | Client secret obtained from dropbox developer console | required |
| oAuthRedirectUrl | App redirect url assignd in dropbox developer console | required |

**[Dropbox Guide](https://developers.dropbox.com/oauth-guide)**

```sh
const db = new Dropbox();
const tokenResult = await db.getDBToken(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REDIRECT_URI
);
```
Response
```sh
tokenResult -> { dropbox_access_token: '', dropbox_uid: '' };
```

## Upload file to Dropbox
Parameters:
| Param | README | Optional
| ------ | ------ | ------ |
| accessToken | Access token from dropbox api | required |
| filePath | The path to the filem which you want to upload | required |
| fileName | Custom file name for the fiel to be upload (excluding extension, it will be auto-obtained from file path) | optional |
| folderName | Folder name, where file will be uploaded (default: My App). Best practice, is to have your project/app name | optional |
| uploadProgress | Callback which will return upload progress | optional |
| partSize | If file exceeds, the default allowed maximum size, then divide files in this size | optional |

**[Dropbox Developer API](https://www.dropbox.com/developers/documentation/http/documentation)**

```sh
const db = new Dropbox();
const uploadResult = await db.uploadFileToDropbox(
    accessToken,
    filePath,
    '',
    '',
    (progress) => {
        //Use the progress to show progress bar
    }
);
```

## License

MIT