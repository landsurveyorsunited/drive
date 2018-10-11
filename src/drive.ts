import { IModule as ISheetbaseModule, IAddonRoutesOptions } from '@sheetbase/core-server';

import { IFileResource, IMethodGetResult, IMethodUploadResult } from './types/module';
import { driveModuleRoutes } from './routes';

declare const Md5;

export class Drive {
    private _Sheetbase: ISheetbaseModule;

    constructor() {}
    
    init(Sheetbase: ISheetbaseModule) {
        this._Sheetbase = Sheetbase;
        return this;
    }

    registerRoutes(options: IAddonRoutesOptions = null) {
        driveModuleRoutes(this._Sheetbase, this, options);
    }

    get(fileId: string): IMethodGetResult {
        const contentFolderId: string = this._Sheetbase.Config.get('contentFolder');
        
        if (!fileId) {
            throw new Error('file/missing');
        }
        
        try {
            if (!contentFolderId) {
                throw new Error(null);
            }
            DriveApp.getFolderById(contentFolderId);
        } catch(error) {
            throw new Error('file/not-supported');
        }

        // get the file
        const file = DriveApp.getFileById(fileId);

        // only allow file in the content folder
        const folders = file.getParents();
        let folderIds: string[] = [];
        while (folders.hasNext()) {
            folderIds.push(folders.next().getId());
        }
        if (folderIds.indexOf(contentFolderId) < 0) {
            throw new Error('Not allowed!');
        }

        // return
        const id = file.getId();
        const name = file.getName();
        const mimeType = file.getMimeType();
        const description = file.getDescription();
        const size = file.getSize();
        const link = file.getUrl();
        return {
            id, name, mimeType, description, size, link,
            url: 'https://drive.google.com/uc?id='+ id +'&export=download'
        };
    }

    upload(fileResource: IFileResource, customFolder: string = null, rename: string = null): IMethodUploadResult {
        const contentFolderId: string = this._Sheetbase.Config.get('contentFolder');
        let folder: GoogleAppsScript.Drive.Folder;

        if (!fileResource) {
            throw new Error('file/missing');
        }

        if (
            !(fileResource instanceof Object) ||
            !fileResource.name || !fileResource.mimeType || !fileResource.base64Content
        ) {
            throw new Error('file/invalid');
        }

        try {
            if (!contentFolderId) {
                throw new Error(null);
            }
            folder = DriveApp.getFolderById(contentFolderId);
        } catch(error) {
            throw new Error('file/not-supported');
        }
        
        // get uploads folder
        folder = this.getFolderByName(folder, 'uploads');

        // custom folder
        if (customFolder) {
            folder = this.getFolderByName(folder, customFolder);
        } else {
            let date = new Date();
            let year = '' + date.getFullYear();
            let month: any = date.getMonth() + 1;
                month = '' + (month < 10 ? '0' + month: month);

            folder = this.getFolderByName(folder, year);
            folder = this.getFolderByName(folder, month);
        }

        let fileName = fileResource.name;
        const fileExt: string = fileName.split('.').pop();
        if (rename) {
            fileName = rename.indexOf(fileExt) > -1 ? rename: rename + '.' + fileExt;
        }
        if (rename === 'MD5') {
            fileName = Md5.md5(fileName) + '.' + fileExt;
        }
        if (rename === 'AUTO') {
            fileName = Utilities.getUuid() + '.' + fileExt;
        }
        
        let newFile = folder.createFile(
            <any> Utilities.newBlob(
                Utilities.base64Decode(fileResource.base64Content, Utilities.Charset.UTF_8),
                fileResource.mimeType,
                fileName
            )
        ).setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        const id = newFile.getId();
        const name = newFile.getName();
        const mimeType = newFile.getMimeType();
        const description = newFile.getDescription();
        const size = newFile.getSize();
        const link = newFile.getUrl();

        return {
            id, name, mimeType, description, size, link,
            url: 'https://drive.google.com/uc?id='+ id +'&export=download'
        };            
    }

    private getFolderByName(parentFolder: GoogleAppsScript.Drive.Folder, folderName: string) {
        let folder = parentFolder;
        let childFolders = folder.getFoldersByName(folderName);
        if(!childFolders.hasNext()) {
            folder = folder.createFolder(folderName);
        } else {
            folder = childFolders.next();
        }
        return folder;
    }

    
}