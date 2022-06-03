import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { authorize } from 'react-native-app-auth';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import _ from 'lodash';
import moment from 'moment';

export default class Dropbox {
  //Get token for dropbox
  getDBToken = async (
    oauthClientId: string,
    oAuthClientSecret: string,
    oAuthRedirectUrl: string
  ) => {
    const config = {
      clientId: oauthClientId,
      clientSecret: oAuthClientSecret,
      redirectUrl: oAuthRedirectUrl,
      scopes: [],
      serviceConfiguration: {
        authorizationEndpoint: 'https://www.dropbox.com/oauth2/authorize',
        tokenEndpoint: 'https://www.dropbox.com/oauth2/token'
      }
    };
    try {
      // Log in to get an authentication token
      const authState = await authorize(config);
      const dropboxUID = authState.tokenAdditionalParameters?.account_id;
      const dropboxAccessToekn = authState.accessToken;
      return {
        status: 200,
        dropbox_uid: dropboxUID,
        dropbox_access_token: dropboxAccessToekn
      };
    } catch (e: any) {
      return e;
    }
  };

  //Upload file to dropbox
  uploadFileToDropbox = async (
    accessToken: string,
    filePath: string,
    fileName?: string,
    folderName?: string,
    uploadProgress?: (progress: number) => void,
    // maxSize: number = 50 * 1024 * 1024,
    partSize: number = 50 * 1024 * 1024
  ) => {
    //extract file extension from url
    var extension = filePath.split('.').reverse()[0];
    //Set file name if not given
    let filename = `${fileName}.${extension}`;
    if (_.isUndefined(fileName) || _.isNull(fileName) || _.isEmpty(fileName)) {
      filename = `${moment().valueOf().toString()}.${extension}`;
    }
    //Set folder name if not given
    let foldername = folderName;
    if (
      _.isUndefined(folderName) ||
      _.isNull(folderName) ||
      _.isEmpty(folderName)
    ) {
      foldername = 'My App';
    }
    const maxSize: number = 50 * 1024 * 1024;
    //Get file size
    var stats = await RNFetchBlob.fs.stat(filePath);
    const fileSize = stats.size;
    //If file size is more than given size then upload in chunks
    if (fileSize > maxSize) {
      if (partSize && partSize > fileSize) {
        return Error('Invalid part size');
      }
      var chunkSize = partSize ? partSize : maxSize;
      var chunks = Math.ceil(fileSize / chunkSize);
      var chunk = 1;

      var file = await RNFS.read(filePath, chunkSize, 0, 'base64');
      var percentage = 0;
      var eachPart = Math.round((chunkSize * 100) / fileSize);

      return RNFetchBlob.fetch(
        'POST',
        'https://content.dropboxapi.com/2/files/upload_session/start',
        {
          // dropbox upload headers
          Authorization: `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            close: false
          }),
          'Content-Type': 'application/octet-stream'
          // Change BASE64 encoded data to a file path with prefix `RNFetchBlob-file://`.
          // Or simply wrap the file path with RNFetchBlob.wrap().
        },
        file
      )
        .then(async (res) => {
          //If status is 401 then token is expired, so regenerate it by calling getDBToken
          if (res.respInfo.status === 401) {
            return res.respInfo;
            //If status is 200 then file upload session is created
          } else if (res.respInfo.status === 200) {
            percentage = eachPart;
            uploadProgress && uploadProgress(percentage);
            var _data = JSON.parse(res.data);
            if (_data && _data.session_id) {
              var _sessionId = _data.session_id;
              while (chunk <= chunks) {
                var offset = chunk * chunkSize;
                var isLast = false;
                if (chunk >= chunks) {
                  isLast = true;
                }

                var _file = await RNFS.read(
                  filePath,
                  chunkSize,
                  isLast ? Math.min(offset + chunkSize, fileSize) : offset,
                  'base64'
                );
                var _arguments: any = {
                  cursor: {
                    offset: isLast
                      ? Math.min(offset + chunkSize, fileSize)
                      : offset,
                    session_id: _sessionId
                  }
                };
                if (isLast) {
                  _arguments.commit = {
                    autorename: true,
                    mode: 'overwrite',
                    mute: false,
                    path: `/${foldername}/${filename}`,
                    strict_conflict: false
                  };
                } else {
                  _arguments.close = false;
                }

                var data = await RNFetchBlob.fetch(
                  'POST',
                  isLast
                    ? 'https://content.dropboxapi.com/2/files/upload_session/finish'
                    : 'https://content.dropboxapi.com/2/files/upload_session/append_v2',
                  {
                    // dropbox upload headers
                    Authorization: `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify(_arguments),
                    'Content-Type': 'application/octet-stream'
                    // Change BASE64 encoded data to a file path with prefix `RNFetchBlob-file://`.
                    // Or simply wrap the file path with RNFetchBlob.wrap().
                  },
                  _file
                )
                  .then((_res) => {
                    eachPart = Math.round(
                      ((Math.min(offset + chunkSize, fileSize) - offset) *
                        100) /
                        fileSize
                    );
                    percentage = Math.min(
                      Math.max(eachPart + percentage, percentage),
                      100
                    );
                    uploadProgress && uploadProgress(percentage);
                    chunk++;
                    return _res.respInfo;
                  })
                  .catch((_e) => {
                    chunk++;
                    return _e;
                  });
                if (data.status !== 200) {
                  return data;
                } else if (isLast) {
                  return data;
                }
              }
            }
          }
        })
        .catch((e) => {
          return e;
        });
    } else {
      //Upload file to dropbox via api call
      return RNFetchBlob.fetch(
        'POST',
        'https://content.dropboxapi.com/2/files/upload',
        {
          // dropbox upload headers
          Authorization: `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: `/${foldername}/${filename}`,
            mode: 'overwrite',
            autorename: true,
            mute: false
          }),
          'Content-Type': 'application/octet-stream'
          // Change BASE64 encoded data to a file path with prefix `RNFetchBlob-file://`.
          // Or simply wrap the file path with RNFetchBlob.wrap().
        },
        RNFetchBlob.wrap(filePath)
      )
        .uploadProgress((written, total) => {
          var _uploadProgress = Math.round((written / total) * 100);
          uploadProgress && uploadProgress(_uploadProgress);
        })
        .then((res) => {
          return res.respInfo;
        })
        .catch((err) => {
          return err;
        });
    }
  };

  //Download File
  actualDownload = (
    url: string,
    fileName: string,
    openOnDownload: boolean,
    downloadProgress?: (progress: number) => void
  ) => {
    const { dirs } = RNFetchBlob.fs;
    const extension = url.split('.').reverse()[0];
    const dirToSave =
      Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
    const filePath = `${dirToSave}/${fileName}.${extension}`;
    const _fileName = `${fileName}.${extension}`;
    const configOpt = {
      fileCache: false,
      useDownloadManager: true,
      notification: true,
      mediaScannable: true,
      title: _fileName,
      path: filePath
      // timeout: 60000
    };
    return RNFetchBlob.config(configOpt)
      .fetch('GET', url, {})
      .progress((received, total) => {
        var dowloadProgress = Math.round((received / total) * 100);
        downloadProgress && downloadProgress(dowloadProgress);
      })
      .then(async (resp) => {
        if (openOnDownload) {
          this.viewFile(resp.data);
        }
        return { success: true, path: resp.data };
      })
      .catch(() => {
        return { success: false, path: '' };
      });
  };

  //Check permission before downloading file
  downloadFile = async (
    url: string,
    fileName: string,
    openOnDownload: boolean,
    downloadProgress?: (progress: number) => void
  ) => {
    try {
      if (Platform.OS === 'ios') {
        return this.actualDownload(
          url,
          fileName,
          openOnDownload,
          downloadProgress
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return this.actualDownload(
            url,
            fileName,
            openOnDownload,
            downloadProgress
          );
        } else {
          Alert.alert(
            'Permission Denied!',
            'You need to give storage permission to download the file'
          );
          return { success: false, path: '' };
        }
      }
    } catch (err) {
      return { success: false, path: '' };
    }
  };

  //Open file once download
  viewFile = (filePath: string) => {
    if (filePath === '') {
      return;
    }
    const extension = filePath.split('.').reverse()[0];
    if (Platform.OS === 'ios') {
      RNFetchBlob.ios.openDocument(filePath);
    } else {
      RNFetchBlob.android.actionViewIntent(
        filePath,
        `application/${extension}`
      );
    }
  };
}
