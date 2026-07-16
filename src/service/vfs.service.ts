import { google } from 'googleapis';
import { UserModel } from '../model/userModel';
import { IVfsNodeDocument, VfsNodeModel } from '../model/vfsNodeModel';
import { Types } from 'mongoose';

export class VfsService {
  private static getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Helper: Get an authenticated Google Drive client for a user
   */
  private static async getDriveClient(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user || !user.googleDrive || !user.googleDrive.isConnected) {
      return null;
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: user.googleDrive.accessToken,
      refresh_token: user.googleDrive.refreshToken,
    });

    // Auto-refresh token if expired (handled by google-auth-library)
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        user.googleDrive!.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
          user.googleDrive!.refreshToken = tokens.refresh_token;
        }
        await user.save();
      }
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Generate a link for a specific session user
  public static generateAuthUrl(userId: string): string {
    const oauth2Client = this.getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/drive.file'];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId // Pass the session user ID to state
    });
  }

  // Quick check: is the drive already mapped?
  public static async isConnected(userId: string): Promise<boolean> {
    const user = await UserModel.findById(userId);
    return !!user?.googleDrive?.isConnected;
  }

  /**
   * Helper: Find the real Google Drive folder ID mapped to our DB node
   */
  private static async getGoogleParentId(userId: string, parentId: string | null): Promise<string | null> {
    if (!parentId) return 'root';
    const parentNode = await VfsNodeModel.findOne({ _id: new Types.ObjectId(parentId), userId: new Types.ObjectId(userId) });
    return parentNode?.gdriveId || 'root';
  }

  /**
  * 1. Creating a directory (mkdir)
  */
  public static async mkdir(userId: string, dirName: string, parentId: string | null): Promise<string> {
    try {
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(dirName)) {
        return '\x1b[31m[WFS ERROR]: Invalid directory name. Use only alphanumeric characters, dots, hyphens or underscores.\x1b[0m';
      }
      
      const parentObjectId = parentId ? new Types.ObjectId(parentId) : null;
      const userObjectId = new Types.ObjectId(userId);
      
      const exists = await VfsNodeModel.findOne({
        userId : userObjectId,
        parentId : parentObjectId,
        name: dirName
      });

      if (exists) {
        return `\x1b[31m[WFS ERROR]: mkdir: cannot create directory '${dirName}': File or directory exists.\x1b[0m`;
      }

      let gdriveId: string | undefined;
      let isSynced = false;

      // Google Drive Synchronization
      const drive = await this.getDriveClient(userId);
      if (drive) {
        const googleParentId = await this.getGoogleParentId(userId, parentId);
        const fileMetadata = {
          name: dirName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: googleParentId ? [googleParentId] : []
        };
        const folder = await drive.files.create({
          requestBody: fileMetadata,
          fields: 'id',
        });
        gdriveId = folder.data.id || undefined;
        isSynced = true;
      }

      // Create a new node folder in MongoDB
      await VfsNodeModel.create({
        userId : userObjectId,
        name: dirName,
        type: 'dir',
        parentId : parentObjectId,
        content: '',
        gdriveId,
        isSynced
      });

      return `\x1b[32mCreated directory: ${dirName}${isSynced ? ' (Synced with GDrive)' : ''}\x1b[0m`;
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: Failed to create directory. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 2. Creating a file (touch)
   */
  public static async touch(userId: string, fileName: string, parentId: string | null): Promise<string> {
    try {
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(fileName)) {
        return '\x1b[31m[WFS ERROR]: Invalid file name. Use only alphanumeric characters, dots, hyphens or underscores.\x1b[0m';
      }

      const parentObjectId = parentId ? new Types.ObjectId(parentId) : null;
      const userObjectId = new Types.ObjectId(userId);

      const exists = await VfsNodeModel.findOne({
        userId: userObjectId,
        parentId: parentObjectId,
        name: fileName
      });

      if (exists) {
        return `\x1b[31m[WFS ERROR]: touch: file already exists.\x1b[0m`;
      }

      let gdriveId: string | undefined;
      let isSynced = false;

      // Google Drive Synchronization
      const drive = await this.getDriveClient(userId);
      if (drive) {
        const googleParentId = await this.getGoogleParentId(userId, parentId);
        const fileMetadata = {
          name: fileName,
          parents: googleParentId ? [googleParentId] : []
        };
        const media = {
          mimeType: 'text/plain',
          body: ''
        };
        const file = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id',
        });
        gdriveId = file.data.id || undefined;
        isSynced = true;
      }

      await VfsNodeModel.create({
        userId: userObjectId,
        name: fileName,
        type: 'file',
        parentId: parentObjectId,
        content: '',
        gdriveId,
        isSynced
      });

      return `\x1b[32mCreated file: ${fileName}${isSynced ? ' (Synced with GDrive)' : ''}\x1b[0m`;
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: touch failed. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 3. Writing content to a file (echo >)
   */
  public static async writeFileContent(userId: string, fileName: string, parentId: string | null, content: string): Promise<string> {
    try {
      const parentObjectId = parentId ? new Types.ObjectId(parentId) : null;
      const userObjectId = new Types.ObjectId(userId);

      let fileNode = await VfsNodeModel.findOne({
        userId: userObjectId,
        parentId: parentObjectId,
        name: fileName,
        type: 'file'
      });

      let gdriveId = fileNode?.gdriveId;
      let isSynced = fileNode ? fileNode.isSynced : false;

      // Google Drive Synchronization
      const drive = await this.getDriveClient(userId);
      if (drive) {
        const googleParentId = await this.getGoogleParentId(userId, parentId);
        
        if (gdriveId) {
          // Update existing Google Drive File
          const media = {
            mimeType: 'text/plain',
            body: content
          };
          await drive.files.update({
            fileId: gdriveId,
            media: media,
          });
        } else {
          // Create new file on Google Drive
          const fileMetadata = {
            name: fileName,
            parents: googleParentId ? [googleParentId] : []
          };
          const media = {
            mimeType: 'text/plain',
            body: content
          };
          const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
          });
          gdriveId = file.data.id || undefined;
        }
        isSynced = true;
      }

      if (fileNode) {
        fileNode.content = content;
        fileNode.gdriveId = gdriveId;
        fileNode.isSynced = isSynced;
        await fileNode.save();
      } else {
        // If file doesn't exist, echo > creates it
        await VfsNodeModel.create({
          userId: userObjectId,
          name: fileName,
          type: 'file',
          parentId: parentObjectId,
          content: content,
          gdriveId,
          isSynced
        });
      }

      return `\x1b[32mWritten successfully to '${fileName}'${isSynced ? ' (Synced with GDrive)' : ''}\x1b[0m`;
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: Failed to write to file. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 4. Viewing file content (cat)
   */
  public static async cat(userId: string, currentDirId: string | null, targetName: string): Promise<string> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const parentObjectId = currentDirId ? new Types.ObjectId(currentDirId) : null;

      const fileNode = await VfsNodeModel.findOne({
        userId: userObjectId,
        parentId: parentObjectId,
        name: targetName,
        type: 'file'
      });

      if (!fileNode) {
        return `\x1b[31mcat: ${targetName}: No such file\x1b[0m`;
      }

      // If synced with Google Drive, we can dynamically fetch the actual cloud content
      const drive = await this.getDriveClient(userId);
      if (drive && fileNode.gdriveId) {
        try {
          const response = await drive.files.get({
            fileId: fileNode.gdriveId,
            alt: 'media',
          });
          
          const cloudContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          
          // Update MongoDB cache to stay in sync
          fileNode.content = cloudContent;
          await fileNode.save();
          
          return cloudContent || '\x1b[90m(file is empty)\x1b[0m';
        } catch {
          // If GDrive fails, fall back to locally cached content
          return fileNode.content || '\x1b[90m(file is empty - cloud fallback)\x1b[0m';
        }
      }

      return fileNode.content || '\x1b[90m(file is empty)\x1b[0m';
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: cat failed. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 5. Removing files or directories recursively (rm)
   */
  public static async rm(userId: string, currentDirId: string | null, targetName: string): Promise<string> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const parentObjectId = currentDirId ? new Types.ObjectId(currentDirId) : null;

      const node = await VfsNodeModel.findOne({
        userId: userObjectId,
        parentId: parentObjectId,
        name: targetName
      });

      if (!node) {
        return `\x1b[31mrm: ${targetName}: No such file or directory\x1b[0m`;
      }

      const drive = await this.getDriveClient(userId);

      // Recursive helper for deleting folders inside DB & GDrive
      const deleteRecursively = async (targetNode: IVfsNodeDocument) => {
        if (targetNode.type === 'dir') {
          const children = await VfsNodeModel.find({ userId: userObjectId, parentId: targetNode._id });
          for (const child of children) {
            await deleteRecursively(child);
          }
        }

        // Delete from Google Drive
        if (drive && targetNode.gdriveId) {
          try {
            await drive.files.delete({ fileId: targetNode.gdriveId });
          } catch (e) {
            // Ignore if already deleted on Drive manually
          }
        }

        // Delete from DB
        await VfsNodeModel.deleteOne({ _id: targetNode._id });
      };

      await deleteRecursively(node);
      return `\x1b[32mSuccessfully removed: ${targetName}\x1b[0m`;
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: rm failed. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 6. Determining the current path for the pwd command
   */
  public static async getAbsolutePath(userId: string, currentDirId: string | null): Promise<string> {
    if (!currentDirId) {
      return '/';
    }

    try {
      const pathParts: string[] = [];
      let currentId: string | null = currentDirId;
      const userObjectId = new Types.ObjectId(userId);

      while (currentId) {
        const targetObjectId: Types.ObjectId = new Types.ObjectId(currentId);
        
        const node: IVfsNodeDocument | null = await VfsNodeModel.findOne({ 
          _id: targetObjectId, 
          userId: userObjectId 
        });
        
        if (!node) break;

        pathParts.unshift(node.name);
        currentId = node.parentId ? node.parentId.toString() : null;
      }

      return '/' + pathParts.join('/');
    } catch {
      return '\x1b[31m[WFS ERROR]: Failed to resolve path.\x1b[0m';
    }
  }

  /**
   * 7. Listing directory contents (ls)
   */
  public static async ls(userId: string, currentDirId: string | null): Promise<string> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const parentObjectId = currentDirId ? new Types.ObjectId(currentDirId) : null;

      const nodes = await VfsNodeModel.find({
        userId: userObjectId,
        parentId: parentObjectId
      }).sort({ type: 1, name: 1 });

      if (nodes.length === 0) {
        return '\x1b[90m(directory is empty)\x1b[0m';
      }

      let output = '';
      nodes.forEach((node) => {
        const syncBadge = node.isSynced ? ' \x1b[36m☁️\x1b[0m' : '';
        if (node.type === 'dir') {
          output += `📁 \x1b[34m${node.name}/\x1b[0m${syncBadge}   `;
        } else {
          output += `📄 \x1b[32m${node.name}\x1b[0m${syncBadge}   `;
        }
      });

      return output.trim();
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: ls failed. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 8. Change directory (cd)
   */
  public static async cd(
    userId: string, 
    currentDirId: string | null, 
    targetPath: string
  ): Promise<{ newDirId: string | null; error?: string }> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      if (targetPath === '/' || targetPath === '~') {
        return { newDirId: null };
      }

      if (targetPath === '..') {
        if (!currentDirId) {
          return { newDirId: null };
        }
        const currentFolder = await VfsNodeModel.findOne({ _id: new Types.ObjectId(currentDirId), userId: userObjectId });
        if (!currentFolder) {
          return { newDirId: null, error: '\x1b[31mcd: current directory is lost.\x1b[0m' };
        }
        return { newDirId: currentFolder.parentId ? currentFolder.parentId.toString() : null };
      }

      const targetFolder = await VfsNodeModel.findOne({
        userId: userObjectId,
        parentId: currentDirId ? new Types.ObjectId(currentDirId) : null,
        name: targetPath,
        type: 'dir'
      });

      if (!targetFolder) {
        const isFile = await VfsNodeModel.findOne({
          userId: userObjectId,
          parentId: currentDirId ? new Types.ObjectId(currentDirId) : null,
          name: targetPath,
          type: 'file'
        });

        if (isFile) {
          return { newDirId: currentDirId, error: `\x1b[31mcd: not a directory: ${targetPath}\x1b[0m` };
        }

        return { newDirId: currentDirId, error: `\x1b[31mcd: no such file or directory: ${targetPath}\x1b[0m` };
      }

      return { newDirId: targetFolder._id.toString() };
    } catch (error: any) {
      return { newDirId: currentDirId, error: `\x1b[31m[WFS ERROR]: cd failed. (${error.message})\x1b[0m` };
    }
  }
}